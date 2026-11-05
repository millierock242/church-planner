import { loginAdmin } from "@/app/actions";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">Admin Login</h1>
        <form 
          action={async (formData) => {
            "use server";
            await loginAdmin(formData);
          }} 
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Admin Password</label>
            <input type="password" name="password" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}