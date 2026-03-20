declare module 'node-forge' {
  interface Ed25519KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }

  interface Ed25519SignOptions {
    message: Uint8Array;
    privateKey: Uint8Array;
  }

  interface Ed25519Module {
    generateKeyPair(): Ed25519KeyPair;
    sign(options: Ed25519SignOptions): Uint8Array;
  }

  interface ForgeModule {
    ed25519: Ed25519Module;
  }

  const forge: ForgeModule;
  export default forge;
}
