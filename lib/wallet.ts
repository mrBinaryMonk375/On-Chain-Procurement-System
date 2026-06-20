// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _kit: any = null;

export async function getWalletKit() {
  if (typeof window === "undefined") {
    throw new Error("StellarWalletsKit can only be initialized on the client side.");
  }

  if (!_kit) {
    const { StellarWalletsKit, Networks } = await import("@creit.tech/stellar-wallets-kit");
    const { FreighterModule } = await import("@creit.tech/stellar-wallets-kit/modules/freighter");
    const { AlbedoModule } = await import("@creit.tech/stellar-wallets-kit/modules/albedo");
    const { xBullModule } = await import("@creit.tech/stellar-wallets-kit/modules/xbull");
    const { LobstrModule } = await import("@creit.tech/stellar-wallets-kit/modules/lobstr");

    StellarWalletsKit.init({
      network: Networks.TESTNET,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new xBullModule(),
        new LobstrModule(),
      ],
    });
    _kit = StellarWalletsKit;
  }
  
  return _kit;
}
