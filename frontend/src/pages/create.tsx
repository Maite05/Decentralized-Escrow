import type { NextPage } from "next";
import Link from "next/link";
import { WalletButton } from "../components/WalletButton";
import { CreateEscrow } from "../components/CreateEscrow";

const CreatePage: NextPage = () => {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          ← Back to Dashboard
        </Link>
        <WalletButton />
      </header>

      <CreateEscrow />
    </main>
  );
};

export default CreatePage;
