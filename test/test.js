const Voting = artifacts.require('./Voting.sol');

const { BN, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract('Voting', accounts => {
    const owner = accounts[0];
    const voter = accounts[1];
    const voter2 = accounts[2];
    const voter3 = accounts[3];
    const voter4 = accounts[4];
    let notOwner = accounts[5];
    const proposal = "My proposal";
    const proposal2 = "My second";

    let VotingInstance;

    describe('GENESIS proposal', () => {

        beforeEach(async function () {
            VotingInstance = await Voting.new({ from: owner });
        })

        it('check if we are a genesis proposal', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.startProposalsRegistering();
            let checkProposal = "GENESIS";
            let genesisProposal = await VotingInstance.getOneProposal(0, { from: voter })
            expect(genesisProposal.description).to.equal(checkProposal);
        })
    })

    describe('check getVoter ', () => {

        beforeEach(async function () {
            VotingInstance = await Voting.new({ from: owner })
        })

        it('Revert if not voter', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await (expectRevert(VotingInstance.getVoter(voter, { from: owner }), "You're not a voter"));
        })
    })

    describe("AddVoter", () => {

        beforeEach(async function () {
            VotingInstance = await Voting.new({ from: owner });
        })

        it('Revert if not the owner', async () => {
            await (expectRevert(VotingInstance.addVoter(voter, { from: notOwner }), "Ownable: caller is not the owner"));
        })
        it('Chek if we are status RegisteringVoters', async () => {
            const status = await VotingInstance.workflowStatus.call();
            expect(status).to.be.bignumber.equal(new BN(0));
        })
        it('check if voter doesnt have already voted', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            let newVoter = await VotingInstance.getVoter(voter, { from: voter });
            expect(newVoter.hasVoted).to.be.false;
        })
        it('check votedProposalId is null', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            let newVoter = await VotingInstance.getVoter(voter, { from: voter });
            expect(newVoter.votedProposalId).to.be.bignumber.equal(new BN(0));
        })
        it('Revert if voter already registered', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await (expectRevert(VotingInstance.addVoter(voter, { from: owner }), "Already registered"));
        });
        it('check if isRegistered is true', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            let newVoter = await VotingInstance.getVoter(voter, { from: voter });
            expect(newVoter.isRegistered).to.be.true;
        })
        it('Check the VoterRegistered Event', async () => {
            let TX = await VotingInstance.addVoter(voter, { from: owner });
            expectEvent(TX, 'VoterRegistered', { voterAddress: voter })
        })
        it('Check VoterRegistered Event everytime', async () => {
            let voters = [
                voter,
                voter2,
                voter3
            ]
            for (let i = 0; i < voters.length; i++) {
                let TX = await VotingInstance.addVoter(voters[i], { from: owner });
                expectEvent(TX, 'VoterRegistered', {
                    voterAddress: voters[i]
                })
            }
        })
        it('Get a specific voter', async () => {
            let adresses = [
                voter,
                voter2,
                voter3
            ]
            for (let i = 0; i < adresses.length; i++) {
                await VotingInstance.addVoter(adresses[i], { from: owner });
            }
            let firstVoter = await VotingInstance.getVoter(voter, { from: voter });
            expect(firstVoter.isRegistered).to.be.true;
            let secondVoter = await VotingInstance.getVoter(voter2, { from: voter });
            expect(secondVoter.isRegistered).to.be.true;
            let thirdVoter = await VotingInstance.getVoter(voter3, { from: voter });
            expect(thirdVoter.isRegistered).to.be.true;
            let notVoter = await VotingInstance.getVoter(voter4, { from: voter });
            expect(notVoter.isRegistered).to.be.false;
        })
    })

    describe('addProposal', () => {

        beforeEach(async function () {
            VotingInstance = await Voting.new({ from: owner });
        })
        it('Chek if we are status ProposalsRegistrationStarted', async function () {
            await VotingInstance.startProposalsRegistering();
            const status = await VotingInstance.workflowStatus.call();
            expect(status).to.be.bignumber.equal(new BN(1));
        })
        it('check description of proposal', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter })
            let proposalOfVoter = await VotingInstance.getOneProposal(1, { from: voter });
            expect(proposalOfVoter.description).to.equal(proposal);
        })
        it('check voteCount of proposal is equal 0 at the begining', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter });
            let proposalOfVoter = await VotingInstance.getOneProposal(1, { from: voter });
            expect(proposalOfVoter.voteCount).to.be.bignumber.equal(new BN(0));
        })
        it('Check Event ProposalRegistered', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.startProposalsRegistering();
            let TX = await VotingInstance.addProposal(proposal, { from: voter })
            await expectEvent(TX, "ProposalRegistered", { proposalId: '1' })
        })
    })

    describe('Voting Session', () => {
        beforeEach(async function () {
            VotingInstance = await Voting.new({ from: owner });
        })
        it('check VotingSessionStarted session', async () => {
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            const status = await VotingInstance.workflowStatus.call();
            expect(status).to.be.bignumber.equal(new BN(3));
        });
        it('Revert if is not voters status', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter })
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            await (expectRevert(VotingInstance.setVote(0, { from: owner }), "You're not a voter"));
        })
        it('check if voter has already voted', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.addVoter(voter2, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter })
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            await VotingInstance.setVote(0, { from: voter2 })
            let thisVoter = await VotingInstance.getVoter(voter2, { from: voter2 });
            expect(thisVoter.hasVoted).to.be.true;
        })
        it('revert if voter has already voted', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.addVoter(voter2, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter })
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            await VotingInstance.setVote(0, { from: voter2 })
            await (expectRevert(VotingInstance.setVote(0, { from: voter2 }), "You have already voted"));
        })
        it('check the correspondence of the ids', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter })
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            await VotingInstance.setVote(0, { from: voter });
            let thisVoter = await VotingInstance.getVoter(voter, { from: voter });
            expect(thisVoter.votedProposalId).to.be.bignumber.equal(new BN(0));
        });
        it('check voteCount increment', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.addVoter(voter2, { from: owner });
            await VotingInstance.addVoter(voter3, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter });
            await VotingInstance.addProposal(proposal2, { from: voter2 });
            await VotingInstance.addProposal(proposal2, { from: voter3 });
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            await VotingInstance.setVote(0, { from: voter });
            await VotingInstance.setVote(1, { from: voter2 });
            await VotingInstance.setVote(1, { from: voter3 });
            let genesisProposal = await VotingInstance.getOneProposal(0, { from: voter });
            let firstProposal = await VotingInstance.getOneProposal(1, { from: voter2 });
            let secondProposal = await VotingInstance.getOneProposal(2, { from: voter3 });
            expect(genesisProposal.voteCount).to.be.bignumber.equal(new BN(1));
            expect(firstProposal.voteCount).to.be.bignumber.equal(new BN(2));
            expect(secondProposal.voteCount).to.be.bignumber.equal(new BN(0));
        })
        it('check event Voted', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter })
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            let TX = await VotingInstance.setVote(1, { from: voter });
            expectEvent(TX, 'Voted', {
                voter: voter,
                proposalId: new BN(1)
            });
        })
    })

    describe('Tally votes', () => {
        beforeEach(async function () {
            VotingInstance = await Voting.new({ from: owner })
        })
        it('check onlyOwner', async () => {
            await VotingInstance.startProposalsRegistering({ from: owner });
            await VotingInstance.endProposalsRegistering({ from: owner });
            await VotingInstance.startVotingSession({ from: owner });
            await VotingInstance.endVotingSession({ from: owner });
            await (expectRevert(VotingInstance.tallyVotes({ from: notOwner }), "Ownable: caller is not the owner"));
        })
        it('Check current status', async () => {
            await VotingInstance.startProposalsRegistering({ from: owner });
            await VotingInstance.endProposalsRegistering({ from: owner });
            await VotingInstance.startVotingSession({ from: owner });
            await VotingInstance.endVotingSession({ from: owner });
            let status = await VotingInstance.workflowStatus.call();
            expect(status).to.be.bignumber.equal(new BN(4));
        })
        it('check winnnerId', async () => {
            await VotingInstance.addVoter(voter, { from: owner });
            await VotingInstance.addVoter(voter2, { from: owner });
            await VotingInstance.addVoter(voter3, { from: owner });
            await VotingInstance.startProposalsRegistering();
            await VotingInstance.addProposal(proposal, { from: voter });
            await VotingInstance.addProposal(proposal2, { from: voter2 });
            await VotingInstance.addProposal(proposal2, { from: voter3 });
            await VotingInstance.endProposalsRegistering();
            await VotingInstance.startVotingSession();
            await VotingInstance.setVote(0, { from: voter });
            await VotingInstance.setVote(2, { from: voter2 });
            await VotingInstance.setVote(2, { from: voter3 });
            await VotingInstance.endVotingSession({ from: owner })
            await VotingInstance.tallyVotes({ from: owner });
            let winnerId = await VotingInstance.winningProposalID.call();
            expect(winnerId).to.be.bignumber.equal(new BN(2));

        })
    })

    describe('Test change all sessions from owner only', () => {
        beforeEach(async function () {
            VotingInstance = await Voting.new({ from: owner });
        })
        it('Revert StartProposalsRegistering if not the owner', async () => {
            await (expectRevert(VotingInstance.startProposalsRegistering({ from: notOwner }), "Ownable: caller is not the owner"));
        })
        it('Revert endProposalRegistering if not the owner', async () => {
            await (expectRevert(VotingInstance.endProposalsRegistering({ from: notOwner }), "Ownable: caller is not the owner"));
        })
        it('Revert startVotingSession if not the owner', async () => {
            await (expectRevert(VotingInstance.startVotingSession({ from: notOwner }), "Ownable: caller is not the owner"))
        })
        it('Revert endVotinSession if not the owner', async () => {
            await (expectRevert(VotingInstance.endVotingSession({ from: notOwner }), "Ownable: caller is not the owner"))
        })
    })
})
