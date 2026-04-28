/**
 * Auto-generated IDL types for the Clawglasses Anchor program.
 * In production, run `anchor build` to generate this from the Rust source.
 * This hand-written version matches the on-chain program structure.
 */

export type Clawglasses = {
  version: "0.1.0";
  name: "clawglasses";
  instructions: [
    {
      name: "initialize";
      accounts: [
        { name: "config"; isMut: true; isSigner: false },
        { name: "sightMint"; isMut: false; isSigner: false },
        { name: "authority"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "treasury"; type: "publicKey" }];
    },
    {
      name: "registerNode";
      accounts: [
        { name: "node"; isMut: true; isSigner: false },
        { name: "config"; isMut: true; isSigner: false },
        { name: "owner"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "deviceModel"; type: "string" }];
    },
    {
      name: "mintNftPass";
      accounts: [
        { name: "nftPass"; isMut: true; isSigner: false },
        { name: "config"; isMut: true; isSigner: false },
        { name: "buyer"; isMut: true; isSigner: true },
        { name: "buyerSightAta"; isMut: true; isSigner: false },
        { name: "rewardPoolAta"; isMut: true; isSigner: false },
        { name: "treasurySightAta"; isMut: true; isSigner: false },
        { name: "sightMint"; isMut: false; isSigner: false },
        { name: "tokenProgram"; isMut: false; isSigner: false },
        { name: "associatedTokenProgram"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: "stakeNft";
      accounts: [
        { name: "nftPass"; isMut: true; isSigner: false },
        { name: "node"; isMut: true; isSigner: false },
        { name: "config"; isMut: true; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [];
    },
    {
      name: "unstakeNft";
      accounts: [
        { name: "nftPass"; isMut: true; isSigner: false },
        { name: "node"; isMut: true; isSigner: false },
        { name: "config"; isMut: true; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [];
    },
    {
      name: "distributeRewards";
      accounts: [
        { name: "config"; isMut: false; isSigner: false },
        { name: "authority"; isMut: false; isSigner: true }
      ];
      args: [{ name: "amountPerNft"; type: "u64" }];
    },
    {
      name: "addSimulatedStakes";
      accounts: [
        { name: "config"; isMut: false; isSigner: false },
        { name: "node"; isMut: true; isSigner: false },
        { name: "authority"; isMut: false; isSigner: true }
      ];
      args: [{ name: "count"; type: "u16" }];
    },
    {
      name: "removeSimulatedStakes";
      accounts: [
        { name: "config"; isMut: false; isSigner: false },
        { name: "node"; isMut: true; isSigner: false },
        { name: "authority"; isMut: false; isSigner: true }
      ];
      args: [{ name: "count"; type: "u16" }];
    },
    {
      name: "setNodeStatus";
      accounts: [
        { name: "config"; isMut: false; isSigner: false },
        { name: "node"; isMut: true; isSigner: false },
        { name: "authority"; isMut: false; isSigner: true }
      ];
      args: [{ name: "status"; type: { defined: "NodeStatus" } }];
    }
  ];
  accounts: [
    {
      name: "Config";
      type: {
        kind: "struct";
        fields: [
          { name: "authority"; type: "publicKey" },
          { name: "treasury"; type: "publicKey" },
          { name: "sightMint"; type: "publicKey" },
          { name: "totalNodes"; type: "u32" },
          { name: "totalNftsMinted"; type: "u32" },
          { name: "totalNftsStaked"; type: "u32" },
          { name: "rewardPoolBalance"; type: "u64" },
          { name: "bump"; type: "u8" }
        ];
      };
    },
    {
      name: "Node";
      type: {
        kind: "struct";
        fields: [
          { name: "owner"; type: "publicKey" },
          { name: "deviceModel"; type: "string" },
          { name: "totalSlots"; type: "u16" },
          { name: "usedSlots"; type: "u16" },
          { name: "simulatedSlots"; type: "u16" },
          { name: "status"; type: { defined: "NodeStatus" } },
          { name: "registeredAt"; type: "i64" },
          { name: "bump"; type: "u8" }
        ];
      };
    },
    {
      name: "NftPass";
      type: {
        kind: "struct";
        fields: [
          { name: "owner"; type: "publicKey" },
          { name: "mintIndex"; type: "u32" },
          { name: "mintPrice"; type: "u64" },
          { name: "mintedAt"; type: "i64" },
          { name: "expiresAt"; type: "i64" },
          { name: "stakedNode"; type: "publicKey" },
          { name: "isStaked"; type: "bool" },
          { name: "isSimulated"; type: "bool" },
          { name: "bump"; type: "u8" }
        ];
      };
    }
  ];
  types: [
    {
      name: "NodeStatus";
      type: {
        kind: "enum";
        variants: [{ name: "Live" }, { name: "Offline" }];
      };
    }
  ];
  events: [
    {
      name: "NftMinted";
      fields: [
        { name: "owner"; type: "publicKey"; index: false },
        { name: "mintIndex"; type: "u32"; index: false },
        { name: "price"; type: "u64"; index: false },
        { name: "tier"; type: "u8"; index: false }
      ];
    },
    {
      name: "NftStaked";
      fields: [
        { name: "nftIndex"; type: "u32"; index: false },
        { name: "node"; type: "publicKey"; index: false },
        { name: "slot"; type: "u16"; index: false }
      ];
    },
    {
      name: "RewardsDistributed";
      fields: [
        { name: "totalStaked"; type: "u32"; index: false },
        { name: "amountPerNft"; type: "u64"; index: false },
        { name: "timestamp"; type: "i64"; index: false }
      ];
    }
  ];
  errors: [
    { code: 6000; name: "Unauthorized"; msg: "Not authorized" },
    { code: 6001; name: "ModelTooLong"; msg: "Device model name too long (max 8 chars)" },
    { code: 6002; name: "AlreadyStaked"; msg: "NFT pass already staked" },
    { code: 6003; name: "NotStaked"; msg: "NFT pass not staked" },
    { code: 6004; name: "NodeOffline"; msg: "Node is offline" },
    { code: 6005; name: "NoFreeSlots"; msg: "No free slots on this node" },
    { code: 6006; name: "NftExpired"; msg: "NFT pass has expired" },
    { code: 6007; name: "WrongNode"; msg: "Wrong node for this NFT" },
    { code: 6008; name: "MaxSupplyReached"; msg: "Max NFT supply reached" }
  ];
};

export const IDL: Clawglasses = {
  version: "0.1.0",
  name: "clawglasses",
  instructions: [],
  accounts: [],
  types: [],
  events: [],
  errors: [],
} as any;
