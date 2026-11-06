import { loginAdmin } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">Admin Login</h1>
        {error && (
          <p className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3 text-center">
            Incorrect password. Please try again.
          </p>
        )}
        <form action={loginAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Admin Password</label>
            <input type="password" name="password" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-brand-700 cursor-pointer">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
