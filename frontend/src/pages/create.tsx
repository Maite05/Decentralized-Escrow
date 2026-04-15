import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Navbar } from "../components/Navbar";
import { CreateEscrow } from "../components/CreateEscrow";

const CreatePage: NextPage = () => {
  const { query } = useRouter();
  const initialFreelancer = typeof query.freelancer === "string" ? query.freelancer : undefined;
  const initialBudget = typeof query.budget === "string" ? query.budget : undefined;

  return (
    <>
      <Navbar backHref="/" backLabel="Dashboard" />
      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">New Escrow</h1>
          <p className="text-slate-500 text-sm mt-1">
            Deploy a milestone-based escrow contract on X Layer. Funds are locked until work is approved.
          </p>
        </div>
        <CreateEscrow initialFreelancer={initialFreelancer} initialBudget={initialBudget} />
      </main>
    </>
  );
};

export default CreatePage;
