import { useWallet } from "../hooks/useWallet";

export function WalletButton() {
  const {
    address,
    isConnected,
    isWrongChain,
    connect,
    connectors,
    isConnecting,
    disconnect,
    switchChain,
    isSwitching,
    TARGET_CHAIN,
  } = useWallet();

  if (isConnected && isWrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
        disabled={isSwitching}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
      >
        {isSwitching ? "Switching…" : `Wrong Network — Switch to ${TARGET_CHAIN.name}`}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {connectors.map(connector => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {isConnecting ? "Connecting…" : `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  );
}
