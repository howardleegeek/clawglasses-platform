import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Clawglasses } from "../target/types/clawglasses";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { assert } from "chai";

describe("clawglasses", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Clawglasses as Program<Clawglasses>;
  const authority = provider.wallet;

  let sightMint: anchor.web3.PublicKey;
  let treasuryWallet: anchor.web3.Keypair;
  let configPDA: anchor.web3.PublicKey;

  before(async () => {
    // Create $SIGHT test mint
    const mintAuthority = anchor.web3.Keypair.generate();

    // Airdrop to mint authority
    const sig = await provider.connection.requestAirdrop(
      mintAuthority.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    sightMint = await createMint(
      provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      9 // SIGHT decimals
    );

    // Create treasury
    treasuryWallet = anchor.web3.Keypair.generate();
    const sig2 = await provider.connection.requestAirdrop(
      treasuryWallet.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig2);

    // Mint SIGHT to authority wallet for testing
    const authorityATA = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      mintAuthority,
      sightMint,
      authority.publicKey
    );

    await mintTo(
      provider.connection,
      mintAuthority,
      sightMint,
      authorityATA.address,
      mintAuthority,
      1_000_000_000_000_000 // 1M SIGHT
    );

    // Derive config PDA
    [configPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  });

  it("initializes the program", async () => {
    await program.methods
      .initialize(treasuryWallet.publicKey)
      .accounts({
        config: configPDA,
        sightMint,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    assert.equal(config.authority.toBase58(), authority.publicKey.toBase58());
    assert.equal(config.treasury.toBase58(), treasuryWallet.publicKey.toBase58());
    assert.equal(config.totalNodes, 0);
    assert.equal(config.totalNftsMinted, 0);
  });

  it("registers a node", async () => {
    const config = await program.account.config.fetch(configPDA);

    const [nodePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("node"),
        authority.publicKey.toBuffer(),
        new anchor.BN(config.totalNodes).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .registerNode("WG2")
      .accounts({
        node: nodePDA,
        config: configPDA,
        owner: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const node = await program.account.node.fetch(nodePDA);
    assert.equal(node.deviceModel, "WG2");
    assert.equal(node.totalSlots, 20);
    assert.equal(node.usedSlots, 0);
    assert.deepEqual(node.status, { live: {} });
  });

  it("mints an NFT pass", async () => {
    const config = await program.account.config.fetch(configPDA);

    const [nftPassPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_pass"),
        new anchor.BN(config.totalNftsMinted).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    // We need ATAs for reward pool and treasury
    const rewardPoolATA = getAssociatedTokenAddressSync(
      sightMint,
      treasuryWallet.publicKey // using treasury as reward pool for test
    );
    const treasuryATA = getAssociatedTokenAddressSync(
      sightMint,
      treasuryWallet.publicKey
    );
    const buyerATA = getAssociatedTokenAddressSync(
      sightMint,
      authority.publicKey
    );

    await program.methods
      .mintNftPass()
      .accounts({
        nftPass: nftPassPDA,
        config: configPDA,
        buyer: authority.publicKey,
        buyerSightAta: buyerATA,
        rewardPoolAta: rewardPoolATA,
        treasurySightAta: treasuryATA,
        sightMint,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const nftPass = await program.account.nftPass.fetch(nftPassPDA);
    assert.equal(nftPass.owner.toBase58(), authority.publicKey.toBase58());
    assert.equal(nftPass.mintIndex, 0);
    assert.equal(nftPass.isStaked, false);
    assert.equal(nftPass.isSimulated, false);

    const updatedConfig = await program.account.config.fetch(configPDA);
    assert.equal(updatedConfig.totalNftsMinted, 1);
  });

  it("stakes NFT on a node", async () => {
    const config = await program.account.config.fetch(configPDA);

    const [nodePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("node"),
        authority.publicKey.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    const [nftPassPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_pass"),
        new anchor.BN(0).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .stakeNft()
      .accounts({
        nftPass: nftPassPDA,
        node: nodePDA,
        config: configPDA,
        owner: authority.publicKey,
      })
      .rpc();

    const nftPass = await program.account.nftPass.fetch(nftPassPDA);
    assert.equal(nftPass.isStaked, true);

    const node = await program.account.node.fetch(nodePDA);
    assert.equal(node.usedSlots, 1);
  });

  it("adds simulated stakes", async () => {
    const [nodePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("node"),
        authority.publicKey.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .addSimulatedStakes(3)
      .accounts({
        config: configPDA,
        node: nodePDA,
        authority: authority.publicKey,
      })
      .rpc();

    const node = await program.account.node.fetch(nodePDA);
    assert.equal(node.simulatedSlots, 3);
    assert.equal(node.usedSlots, 4); // 1 real + 3 simulated
  });

  it("removes simulated stakes", async () => {
    const [nodePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("node"),
        authority.publicKey.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .removeSimulatedStakes(2)
      .accounts({
        config: configPDA,
        node: nodePDA,
        authority: authority.publicKey,
      })
      .rpc();

    const node = await program.account.node.fetch(nodePDA);
    assert.equal(node.simulatedSlots, 1);
    assert.equal(node.usedSlots, 2); // 1 real + 1 simulated
  });

  it("unstakes NFT", async () => {
    const [nodePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("node"),
        authority.publicKey.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    const [nftPassPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("nft_pass"),
        new anchor.BN(0).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .unstakeNft()
      .accounts({
        nftPass: nftPassPDA,
        node: nodePDA,
        config: configPDA,
        owner: authority.publicKey,
      })
      .rpc();

    const nftPass = await program.account.nftPass.fetch(nftPassPDA);
    assert.equal(nftPass.isStaked, false);

    const node = await program.account.node.fetch(nodePDA);
    assert.equal(node.usedSlots, 1); // only 1 simulated left
  });
});
