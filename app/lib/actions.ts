'use server';
import { number, z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { auth } from '@/auth';
 
const BaseFormSchema = z.object({
  id: z.string(),
  boardName: z.string().max(30, "The input should be 30 characters or fewer."),
  size: z.coerce.number().min(3, { message: "Size field must be filled." }).max(10, { message: "Size must be at most 10." }),
  letters: z.string({
    invalid_type_error: 'Please enter the letters.',
  }).regex(/^[A-Za-z]+$/, { message: 'Letters can only contain English letters.' }),
  date: z.string(),
});

const CreateBoard = BaseFormSchema.omit({ id: true, date: true }).refine(data => data.letters.length === data.size * data.size, {
  message: 'Letters length must be equal to size * size.',
  path: ['letters'],
});

export type State = {
  errors?: {
    boardName?: string[];
    size?: string[];
    letters?: string[];
  };
  message: string;
  size?: number | null;
  letters?: string | null;
};

export async function createBoard(prevState: State, formData: FormData) {
  const session = await auth();
  const boardSize = Number(formData.get('boardSize'));
  const rawFormData = {
    boardName: formData.get('boardName'),
    size: boardSize,
    letters: Array(boardSize * boardSize).fill(null).map((_, id) => formData.get(`letter${id}`)).join('').toUpperCase()
  };
  
  // Test it out:
  console.log(rawFormData);
  const validatedFields = CreateBoard.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing fields or invalid inputs.',
    };
  }
  
  const { boardName, size, letters } = validatedFields.data;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO boards (author, "boardName", size, letters, date)
      VALUES (${session?.user? session.user.name : "anonymous"}, ${boardName}, ${size}, ${letters}, ${date})
    `;
    console.log("successfully add board");
  } catch (error) {
    console.log(error);
    return {
      message: 'Database Error: Failed to Create Board.',
    };
  }
  revalidatePath('/boards');
  redirect('/');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
    console.log('try sign in');
  } catch (error) {
    if (error instanceof AuthError) {
      console.log(error)
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}