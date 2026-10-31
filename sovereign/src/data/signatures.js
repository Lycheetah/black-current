/* Naraka signature registry from Forge 0.29.8 (NARAKA_SIGNATURES), text unchanged.
   Positions are the original WORLD.sig* coordinates; uncertainty is the original offset vector. */
export const NARAKA_SIGNATURES = {
  convoy_echo: {
    id: 'convoy_echo', code: '03A', pos: [-238, 30, 202], detectedName: 'BROKEN TRANSPONDER', name: 'LOST CONVOY ECHO', type: 'SIGNAL',
    uncertainty: [54, 18, -42],
    desc: 'A weak industrial transponder repeats fragments of a route code used by Cinder-era logistics.',
    resolved: 'Recovered convoy telemetry confirms Cinder Relay was forwarding traffic after its official shutdown.',
    research: 10, materials: { drone_parts: 3, ferrite: 4 },
  },
  reliquary: {
    id: 'reliquary', code: '12C', pos: [-112, 80, 326], detectedName: 'CEREMONIAL RESONANCE', name: 'DEAD PILGRIM RELIQUARY', type: 'RUIN',
    uncertainty: [-46, 26, 38],
    desc: 'A powerless reliquary broadcasts a harmonic pattern associated with old Pilgrim Halo navigation rites.',
    resolved: 'The reliquary contains a route-memory fragment older than Asterion records and a surviving violet prism archive.',
    research: 14, materials: { prism_shard: 2 },
  },
  hollow_lens: {
    id: 'hollow_lens', code: '7F', pos: [254, 4, -252], detectedName: 'GRAVITATIONAL DISTORTION', name: 'THE HOLLOW LENS', type: 'ANOMALY',
    uncertainty: [62, -20, 34],
    desc: 'Background stars bend around empty space with no corresponding mass signature.',
    resolved: 'The distortion contains a repeating vector that points deeper than Naraka. The Black Current Atlas now recognises the pattern.',
    research: 16, materials: { void_glass: 3 },
  },
  ferric_undertone: {
    id: 'ferric_undertone', code: 'R9', pos: [-354, -20, 346], detectedName: 'SUBHARMONIC MINERAL RETURN', name: 'FERRIC UNDERTONE', type: 'RESOURCE',
    uncertainty: [-44, 10, -55],
    desc: 'A dense metallic return sits beneath the obvious Ferric Seam, invisible to ordinary prospecting.',
    resolved: 'The undertone resolves into a compact high-density ferrite pocket trapped inside Black Current residue.',
    research: 7, materials: { ferrite: 12, drone_parts: 2 },
  },
  pillar_whisper: {
    id: 'pillar_whisper', code: 'PX', pos: [-34, 88, -326], detectedName: 'PHASE-LOCK WHISPER', name: 'PILLAR WHISPER', type: 'INTERCONNECTOR',
    uncertainty: [38, 28, 52],
    desc: 'A repeating phase tone appears between the Black-Sun Threshold and Aether Pillar Gate.',
    resolved: 'The tone is not a distress signal. It is a handshake sequence between two pieces of route infrastructure.',
    research: 18, materials: { ai_lattice: 1 },
  },
};
