import type { NextPage } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import { WalletButton } from "../../components/WalletButton";
import { MilestoneCard, type MilestoneData } from "../../components/MilestoneCard";
import { TxLog } from "../../components/TxLog";
import { AIInsightPanel } from "../../components/AIInsightPanel";
import { useProject, useMilestone, useMilestoneCount } from "../../hooks/useEscrow";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;

function MilestoneRow({
  escrowAddress,
  milestoneId,
  clientAddress,
  freelancerAddress,
}: {
  escrowAddress: `0x${string}`;
  milestoneId: bigint;
  clientAddress: `0x${string}`;
  freelancerAddress: `0x${string}`;
}) {
  const { data, isLoading } = useMilestone(escrowAddress, milestoneId);
  if (isLoading || !data) {
    return (
      <div className="border border-gray-100 rounded-xl p-4 animate-pulse bg-gray-50 h-20" />
    );
  }
  const [id, amount, state, deliveredAt, description] = data as [
    bigint,
    bigint,
    number,
    bigint,
    string,
  ];
  const milestone: MilestoneData = { id, amount, state, deliveredAt, description };
  return (
    <MilestoneCard
      escrowAddress={escrowAddress}
      milestone={milestone}
      clientAddress={clientAddress}
      freelancerAddress={freelancerAddress}
    />
  );
}

const EscrowDetail: NextPage = () => {
  const router = useRouter();
  const escrowAddress = (router.query.id as `0x${string}`) ?? ZERO_ADDR;

  const { data: projectData, isLoading: projectLoading } =
    useProject(escrowAddress);
  const { data: countData } = useMilestoneCount(escrowAddress);

  const [, client, freelancer, , totalAmount] = (projectData as
    | [bigint, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint]
    | undefined) ?? [0n, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, 0n, 0n];

  const milestoneCount = Number(countData ?? 0n);

  if (!router.isReady) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          ← Dashboard
        </Link>
        <WalletButton />
      </header>

      {/* Escrow address + summary */}
      <section>
        <h1 className="text-lg font-bold font-mono text-gray-800 break-all">
          {escrowAddress}
        </h1>
        {projectLoading ? (
          <div className="h-4 w-64 bg-gray-100 animate-pulse rounded mt-2" />
        ) : (
          <p className="text-sm text-gray-500 mt-1 space-x-3">
            <span>
              Client:{" "}
              <span className="font-mono">{client.slice(0, 6)}…{client.slice(-4)}</span>
            </span>
            <span>
              Freelancer:{" "}
              <span className="font-mono">{freelancer.slice(0, 6)}…{freelancer.slice(-4)}</span>
            </span>
            <span>
              Budget:{" "}
              <span className="font-semibold">
                {(Number(totalAmount) / 1e18).toLocaleString()} tokens
              </span>
            </span>
          </p>
        )}
      </section>

      {/* AI Insight */}
      <AIInsightPanel projectId={escrowAddress} />

      {/* Milestones */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Milestones{" "}
          <span className="text-sm text-gray-400 font-normal">
            ({milestoneCount})
          </span>
        </h2>
        {milestoneCount === 0 ? (
          <p className="text-sm text-gray-400 italic">No milestones added yet.</p>
        ) : (
          Array.from({ length: milestoneCount }, (_, i) => BigInt(i)).map(id => (
            <MilestoneRow
              key={id.toString()}
              escrowAddress={escrowAddress}
              milestoneId={id}
              clientAddress={client}
              freelancerAddress={freelancer}
            />
          ))
        )}
      </section>

      {/* Transaction log */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800">Transaction Log</h2>
        <TxLog escrowAddress={escrowAddress} />
      </section>
    </main>
  );
};

export default EscrowDetail;
