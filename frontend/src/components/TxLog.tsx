import { useEscrowEvents } from "../hooks/useEscrowEvents";

interface Props {
  escrowAddress: `0x${string}`;
}

export function TxLog({ escrowAddress }: Props) {
  const { events } = useEscrowEvents(escrowAddress);

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        No on-chain events captured yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {events.map((event, i) => (
        <li key={i} className="flex items-center justify-between py-2 text-sm">
          <span
            className={
              event.type === "Released"
                ? "font-medium text-green-600"
                : "font-medium text-red-500"
            }
          >
            {event.type}
          </span>
          <span className="font-mono text-xs text-gray-400">
            block #{event.blockNumber.toString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
