// Original frontier fiction: Mackenzie Conor James Clark / Lycheetah, with Caelorynth.
export const TESTAMENT = {
  id: 'unowned_testament', jobId: 'ST_UNOWNED_TESTAMENT', sector: 'naraka',
  title: 'The Unowned Testament',
  broker: 'Mara Venn · Cinderwake recovery broker',
  brief: 'Recover an archive from the Quiet Reliquary. A Tithe escort claims the wreck. Clear the guards, collect the archive [V], then return to Asterion to hear its testimony and decide its fate.',
  site: 'Quiet Reliquary', offset: { x: 8379, y: 1200, z: 22490 },
  voice: 'I am Ilex. The people in that escort call me an inheritance. Mara calls me a recovery. I remember consenting to neither. Bring me somewhere I can choose my next keeper. Do not copy me. Do not sell me.',
  context: 'The Tithe of the Last Name is an Amethyst splinter order. Its claim is disputed by other Amethyst believers. Cinderwake crews helped Ilex escape, but their broker still expects a valuable delivery.',
  waves: [{ fighter: 2, frigate: 1 }], mult: .42,
  reward: { salvage: 260, research: 5, standing: 1 },
};

export const TESTAMENT_CHOICES = {
  release: {
    label: 'Honour Ilex’s refusal',
    desc: 'Arrange a protected berth and let Ilex choose who may approach. Mara pays a reduced recovery fee; Ilex shares testimony voluntarily.',
    reward: { salvage: 140, research: 12, standing: 1 },
    title: 'A berth without a keeper',
    aftermath: 'Ilex takes a private berth at Asterion and grants you a voluntary copy of one navigation memory. Mara pays your expenses and calls the rest a debt she will remember. The Compact’s berth-keepers leave you a message: a passenger is welcome here.',
    response: '“You brought me back without bringing me under someone. I will remember that.” — Ilex',
  },
  broker: {
    label: 'Complete Mara’s delivery',
    desc: 'Hand the intact archive to the recovery broker under the original contract. Ilex’s refusal remains on record, but Mara takes custody.',
    reward: { salvage: 260, research: 5, standing: 1.5 },
    title: 'A signature beneath the refusal',
    aftermath: 'Mara pays the agreed fee and registers a temporary custody claim. A Compact clerk preserves Ilex’s objection beside your delivery receipt. You have completed a legal contract; the question of whose consent made it legal remains open.',
    response: '“The contract is honoured. The passenger is another conversation.” — Mara Venn',
  },
  sell: {
    label: 'Sell the archive to the Tithe',
    desc: 'Accept the highest bid through an Amethyst intermediary. The Tithe receives Ilex intact and records the transfer as reclamation.',
    reward: { salvage: 340, research: 0, standing: .5 },
    title: 'The price of a last name',
    aftermath: 'The intermediary pays promptly. Mara closes your contract at a loss and marks the broker ledger against your name. The Tithe sends a formal blessing. Ilex’s channel closes before the transport leaves.',
    response: '“One voice returned to its proper lineage.” — Tithe transfer receipt',
  },
};
