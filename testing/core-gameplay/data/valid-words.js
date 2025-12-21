/**
 * Valid 2-letter and 3-letter words for test scenario generation
 * These are the shortest valid Scrabble words, useful for single-tile plays
 */

const TWO_LETTER_WORDS = new Set([
  'AA', 'AB', 'AD', 'AE', 'AG', 'AH', 'AI', 'AL', 'AM', 'AN', 'AR', 'AS', 'AT', 'AW', 'AX', 'AY',
  'BA', 'BE', 'BI', 'BO', 'BY',
  'DE', 'DO',
  'ED', 'EF', 'EH', 'EL', 'EM', 'EN', 'ER', 'ES', 'ET', 'EX',
  'FA', 'FE',
  'GO',
  'HA', 'HE', 'HI', 'HM', 'HO',
  'ID', 'IF', 'IN', 'IS', 'IT',
  'JO',
  'KA', 'KI',
  'LA', 'LI', 'LO',
  'MA', 'ME', 'MI', 'MM', 'MO', 'MU', 'MY',
  'NA', 'NE', 'NO', 'NU',
  'OD', 'OE', 'OF', 'OH', 'OI', 'OM', 'ON', 'OP', 'OR', 'OS', 'OW', 'OX', 'OY',
  'PA', 'PE', 'PI',
  'QI',
  'RE',
  'SH', 'SI', 'SO',
  'TA', 'TI', 'TO',
  'UH', 'UM', 'UN', 'UP', 'US', 'UT',
  'WE', 'WO',
  'XI', 'XU',
  'YA', 'YE', 'YO',
  'ZA'
]);

const THREE_LETTER_WORDS = new Set([
  // A
  'AAH', 'AAL', 'AAS', 'ABA', 'ABO', 'ABS', 'ABY', 'ACE', 'ACT', 'ADD', 'ADO', 'ADS', 'ADZ', 'AFF', 'AFT', 'AGA', 'AGE', 'AGO', 'AGS', 'AHA', 'AHI', 'AHS', 'AID', 'AIL', 'AIM', 'AIN', 'AIR', 'AIS', 'AIT', 'ALA', 'ALB', 'ALE', 'ALL', 'ALP', 'ALS', 'ALT', 'AMA', 'AMI', 'AMP', 'AMU', 'ANA', 'AND', 'ANE', 'ANI', 'ANT', 'ANY', 'APE', 'APO', 'APP', 'APT', 'ARB', 'ARC', 'ARE', 'ARF', 'ARK', 'ARM', 'ARS', 'ART', 'ASH', 'ASK', 'ASP', 'ASS', 'ATE', 'ATT', 'AUK', 'AVA', 'AVE', 'AVO', 'AWA', 'AWE', 'AWL', 'AWN', 'AXE', 'AYE', 'AYS', 'AZO',
  // B
  'BAA', 'BAD', 'BAG', 'BAH', 'BAL', 'BAM', 'BAN', 'BAP', 'BAR', 'BAS', 'BAT', 'BAY', 'BED', 'BEE', 'BEG', 'BEL', 'BEN', 'BES', 'BET', 'BEY', 'BIB', 'BID', 'BIG', 'BIN', 'BIO', 'BIS', 'BIT', 'BIZ', 'BOA', 'BOB', 'BOD', 'BOG', 'BOO', 'BOP', 'BOS', 'BOT', 'BOW', 'BOX', 'BOY', 'BRA', 'BRO', 'BRR', 'BUB', 'BUD', 'BUG', 'BUM', 'BUN', 'BUR', 'BUS', 'BUT', 'BUY', 'BYE', 'BYS',
  // C
  'CAB', 'CAD', 'CAM', 'CAN', 'CAP', 'CAR', 'CAT', 'CAW', 'CAY', 'CEE', 'CEL', 'CEP', 'CHI', 'CIG', 'CIS', 'COB', 'COD', 'COG', 'COL', 'CON', 'COO', 'COP', 'COR', 'COS', 'COT', 'COW', 'COX', 'COY', 'COZ', 'CRU', 'CRY', 'CUB', 'CUD', 'CUE', 'CUM', 'CUP', 'CUR', 'CUT', 'CWM',
  // D
  'DAB', 'DAD', 'DAG', 'DAH', 'DAK', 'DAL', 'DAM', 'DAN', 'DAP', 'DAW', 'DAY', 'DEB', 'DEE', 'DEF', 'DEL', 'DEN', 'DEV', 'DEW', 'DEX', 'DEY', 'DIB', 'DID', 'DIE', 'DIF', 'DIG', 'DIM', 'DIN', 'DIP', 'DIS', 'DIT', 'DOC', 'DOE', 'DOG', 'DOL', 'DOM', 'DON', 'DOR', 'DOS', 'DOT', 'DOW', 'DRY', 'DUB', 'DUD', 'DUE', 'DUG', 'DUH', 'DUI', 'DUN', 'DUO', 'DUP', 'DYE',
  // E
  'EAR', 'EAT', 'EAU', 'EBB', 'ECU', 'EDH', 'EDS', 'EEK', 'EEL', 'EFF', 'EFS', 'EFT', 'EGG', 'EGO', 'EKE', 'ELD', 'ELF', 'ELK', 'ELL', 'ELM', 'ELS', 'EME', 'EMS', 'EMU', 'END', 'ENG', 'ENS', 'EON', 'ERA', 'ERE', 'ERG', 'ERN', 'ERR', 'ERS', 'ESS', 'ETA', 'ETH', 'EVE', 'EWE', 'EYE',
  // F
  'FAB', 'FAD', 'FAG', 'FAN', 'FAR', 'FAS', 'FAT', 'FAX', 'FAY', 'FED', 'FEE', 'FEH', 'FEM', 'FEN', 'FER', 'FES', 'FET', 'FEU', 'FEW', 'FEY', 'FEZ', 'FIB', 'FID', 'FIE', 'FIG', 'FIL', 'FIN', 'FIR', 'FIT', 'FIX', 'FIZ', 'FLU', 'FLY', 'FOB', 'FOE', 'FOG', 'FOH', 'FON', 'FOP', 'FOR', 'FOU', 'FOX', 'FOY', 'FRO', 'FRY', 'FUB', 'FUD', 'FUG', 'FUN', 'FUR',
  // G
  'GAB', 'GAD', 'GAE', 'GAG', 'GAL', 'GAM', 'GAN', 'GAP', 'GAR', 'GAS', 'GAT', 'GAY', 'GED', 'GEE', 'GEL', 'GEM', 'GEN', 'GET', 'GEY', 'GHI', 'GIB', 'GID', 'GIE', 'GIG', 'GIN', 'GIP', 'GIT', 'GNU', 'GOA', 'GOB', 'GOD', 'GOO', 'GOR', 'GOS', 'GOT', 'GOX', 'GOY', 'GUL', 'GUM', 'GUN', 'GUT', 'GUV', 'GUY', 'GYM', 'GYP',
  // H
  'HAD', 'HAE', 'HAG', 'HAH', 'HAJ', 'HAM', 'HAO', 'HAP', 'HAS', 'HAT', 'HAW', 'HAY', 'HEH', 'HEM', 'HEN', 'HEP', 'HER', 'HES', 'HET', 'HEW', 'HEX', 'HEY', 'HIC', 'HID', 'HIE', 'HIM', 'HIN', 'HIP', 'HIS', 'HIT', 'HMM', 'HOB', 'HOD', 'HOE', 'HOG', 'HON', 'HOP', 'HOS', 'HOT', 'HOW', 'HOY', 'HUB', 'HUE', 'HUG', 'HUH', 'HUM', 'HUN', 'HUP', 'HUT', 'HYP',
  // I
  'ICE', 'ICH', 'ICK', 'ICY', 'IDS', 'IFF', 'IFS', 'IGG', 'ILK', 'ILL', 'IMP', 'INK', 'INN', 'INS', 'ION', 'IRE', 'IRK', 'ISM', 'ITS', 'IVY',
  // J
  'JAB', 'JAG', 'JAM', 'JAR', 'JAW', 'JAY', 'JEE', 'JET', 'JEU', 'JEW', 'JIB', 'JIG', 'JIN', 'JOB', 'JOE', 'JOG', 'JOT', 'JOW', 'JOY', 'JUG', 'JUN', 'JUS', 'JUT',
  // K
  'KAB', 'KAE', 'KAF', 'KAS', 'KAT', 'KAY', 'KEA', 'KEF', 'KEG', 'KEN', 'KEP', 'KEX', 'KEY', 'KHI', 'KID', 'KIF', 'KIN', 'KIP', 'KIR', 'KIS', 'KIT', 'KOA', 'KOB', 'KOI', 'KOP', 'KOR', 'KOS', 'KUE', 'KYE',
  // L
  'LAB', 'LAC', 'LAD', 'LAG', 'LAM', 'LAP', 'LAR', 'LAS', 'LAT', 'LAV', 'LAW', 'LAX', 'LAY', 'LEA', 'LED', 'LEE', 'LEG', 'LEI', 'LEK', 'LES', 'LET', 'LEU', 'LEV', 'LEX', 'LEY', 'LEZ', 'LIB', 'LID', 'LIE', 'LIN', 'LIP', 'LIS', 'LIT', 'LOB', 'LOG', 'LOO', 'LOP', 'LOT', 'LOW', 'LOX', 'LUG', 'LUM', 'LUV', 'LUX', 'LYE',
  // M
  'MAC', 'MAD', 'MAE', 'MAG', 'MAN', 'MAP', 'MAR', 'MAS', 'MAT', 'MAW', 'MAX', 'MAY', 'MED', 'MEG', 'MEL', 'MEM', 'MEN', 'MET', 'MEW', 'MHO', 'MIB', 'MIC', 'MID', 'MIG', 'MIL', 'MIM', 'MIR', 'MIS', 'MIX', 'MOA', 'MOB', 'MOC', 'MOD', 'MOG', 'MOL', 'MOM', 'MON', 'MOO', 'MOP', 'MOR', 'MOS', 'MOT', 'MOW', 'MUD', 'MUG', 'MUM', 'MUN', 'MUS', 'MUT', 'MYC',
  // N
  'NAB', 'NAE', 'NAG', 'NAH', 'NAM', 'NAN', 'NAP', 'NAW', 'NAY', 'NEB', 'NEE', 'NEG', 'NET', 'NEW', 'NIB', 'NIL', 'NIM', 'NIP', 'NIT', 'NIX', 'NOB', 'NOD', 'NOG', 'NOH', 'NOM', 'NOO', 'NOR', 'NOS', 'NOT', 'NOW', 'NTH', 'NUB', 'NUN', 'NUS', 'NUT',
  // O
  'OAF', 'OAK', 'OAR', 'OAT', 'OBA', 'OBE', 'OBI', 'OCA', 'ODA', 'ODD', 'ODE', 'ODS', 'OES', 'OFF', 'OFT', 'OHM', 'OHO', 'OHS', 'OIL', 'OKA', 'OKE', 'OLD', 'OLE', 'OMS', 'ONE', 'ONO', 'ONS', 'OOH', 'OOT', 'OPE', 'OPS', 'OPT', 'ORA', 'ORB', 'ORC', 'ORE', 'ORS', 'ORT', 'OSE', 'OUD', 'OUR', 'OUT', 'OVA', 'OWE', 'OWL', 'OWN', 'OXO', 'OXY',
  // P
  'PAC', 'PAD', 'PAH', 'PAL', 'PAM', 'PAN', 'PAP', 'PAR', 'PAS', 'PAT', 'PAW', 'PAX', 'PAY', 'PEA', 'PEC', 'PED', 'PEE', 'PEG', 'PEH', 'PEN', 'PEP', 'PER', 'PES', 'PET', 'PEW', 'PHI', 'PHT', 'PIA', 'PIC', 'PIE', 'PIG', 'PIN', 'PIP', 'PIS', 'PIT', 'PIU', 'PIX', 'PLY', 'POD', 'POH', 'POI', 'POL', 'POM', 'POO', 'POP', 'POT', 'POW', 'POX', 'PRO', 'PRY', 'PSI', 'PST', 'PUB', 'PUD', 'PUG', 'PUL', 'PUN', 'PUP', 'PUR', 'PUS', 'PUT', 'PYA', 'PYE', 'PYX',
  // Q
  'QAT', 'QIS', 'QUA',
  // R
  'RAD', 'RAG', 'RAH', 'RAI', 'RAJ', 'RAM', 'RAN', 'RAP', 'RAS', 'RAT', 'RAW', 'RAX', 'RAY', 'REB', 'REC', 'RED', 'REE', 'REF', 'REG', 'REI', 'REM', 'REP', 'RES', 'RET', 'REV', 'REX', 'RHO', 'RIA', 'RIB', 'RID', 'RIF', 'RIG', 'RIM', 'RIN', 'RIP', 'ROB', 'ROC', 'ROD', 'ROE', 'ROM', 'ROT', 'ROW', 'RUB', 'RUE', 'RUG', 'RUM', 'RUN', 'RUT', 'RYA', 'RYE',
  // S
  'SAB', 'SAC', 'SAD', 'SAE', 'SAG', 'SAL', 'SAP', 'SAT', 'SAU', 'SAW', 'SAX', 'SAY', 'SEA', 'SEC', 'SEE', 'SEG', 'SEI', 'SEL', 'SEN', 'SER', 'SET', 'SEW', 'SEX', 'SHA', 'SHE', 'SHH', 'SHY', 'SIB', 'SIC', 'SIM', 'SIN', 'SIP', 'SIR', 'SIS', 'SIT', 'SIX', 'SKA', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SOL', 'SOM', 'SON', 'SOP', 'SOS', 'SOT', 'SOU', 'SOW', 'SOX', 'SOY', 'SPA', 'SPY', 'SRI', 'STY', 'SUB', 'SUE', 'SUK', 'SUM', 'SUN', 'SUP', 'SUQ', 'SYN',
  // T
  'TAB', 'TAD', 'TAE', 'TAG', 'TAJ', 'TAM', 'TAN', 'TAO', 'TAP', 'TAR', 'TAS', 'TAT', 'TAU', 'TAV', 'TAW', 'TAX', 'TEA', 'TED', 'TEE', 'TEG', 'TEL', 'TEN', 'TET', 'TEW', 'THE', 'THO', 'THY', 'TIC', 'TIE', 'TIL', 'TIN', 'TIP', 'TIS', 'TIT', 'TOD', 'TOE', 'TOG', 'TOM', 'TON', 'TOO', 'TOP', 'TOR', 'TOT', 'TOW', 'TOY', 'TRY', 'TSK', 'TUB', 'TUG', 'TUI', 'TUN', 'TUP', 'TUT', 'TUX', 'TWA', 'TWO', 'TYE',
  // U
  'UDO', 'UGH', 'UKE', 'ULU', 'UMM', 'UMP', 'UNS', 'UPO', 'UPS', 'URB', 'URD', 'URN', 'URP', 'USE', 'UTA', 'UTE', 'UTS',
  // V
  'VAC', 'VAN', 'VAR', 'VAS', 'VAT', 'VAU', 'VAV', 'VAW', 'VEE', 'VEG', 'VET', 'VEX', 'VIA', 'VID', 'VIE', 'VIG', 'VIM', 'VIS', 'VOE', 'VOW', 'VOX', 'VUG', 'VUM',
  // W
  'WAB', 'WAD', 'WAE', 'WAG', 'WAN', 'WAP', 'WAR', 'WAS', 'WAT', 'WAW', 'WAX', 'WAY', 'WEB', 'WED', 'WEE', 'WEN', 'WET', 'WHA', 'WHO', 'WHY', 'WIG', 'WIN', 'WIS', 'WIT', 'WIZ', 'WOE', 'WOG', 'WOK', 'WON', 'WOO', 'WOP', 'WOS', 'WOT', 'WOW', 'WRY', 'WUD', 'WYE', 'WYN',
  // X
  'XIS',
  // Y
  'YAG', 'YAH', 'YAK', 'YAM', 'YAP', 'YAR', 'YAW', 'YAY', 'YEA', 'YEH', 'YEN', 'YEP', 'YES', 'YET', 'YEW', 'YID', 'YIN', 'YIP', 'YOB', 'YOD', 'YOK', 'YOM', 'YON', 'YOU', 'YOW', 'YUK', 'YUM', 'YUP',
  // Z
  'ZAG', 'ZAP', 'ZAS', 'ZAX', 'ZED', 'ZEE', 'ZEK', 'ZEP', 'ZIG', 'ZIN', 'ZIP', 'ZIT', 'ZOA', 'ZOO', 'ZUZ'
]);

/**
 * Check if a word is valid (2 or 3 letters)
 */
function isValidWord(word) {
  const upper = word.toUpperCase();
  return TWO_LETTER_WORDS.has(upper) || THREE_LETTER_WORDS.has(upper);
}

/**
 * Check if a 2-letter combination is valid
 */
function isValid2Letter(word) {
  return TWO_LETTER_WORDS.has(word.toUpperCase());
}

/**
 * Check if a 3-letter combination is valid
 */
function isValid3Letter(word) {
  return THREE_LETTER_WORDS.has(word.toUpperCase());
}

/**
 * Given a board letter, find all rack letters that can form valid 2-letter words
 * Returns array of { rackLetter, word, position } where position is 'before' or 'after'
 */
function findValid2LetterPlays(boardLetter, rackLetters) {
  const plays = [];
  const bl = boardLetter.toUpperCase();

  for (const rl of rackLetters) {
    const rackLetter = rl.toUpperCase();

    // Check if rackLetter + boardLetter is valid (rack tile goes before)
    const wordBefore = rackLetter + bl;
    if (TWO_LETTER_WORDS.has(wordBefore)) {
      plays.push({ rackLetter, word: wordBefore, position: 'before' });
    }

    // Check if boardLetter + rackLetter is valid (rack tile goes after)
    const wordAfter = bl + rackLetter;
    if (TWO_LETTER_WORDS.has(wordAfter)) {
      plays.push({ rackLetter, word: wordAfter, position: 'after' });
    }
  }

  return plays;
}

module.exports = {
  TWO_LETTER_WORDS,
  THREE_LETTER_WORDS,
  isValidWord,
  isValid2Letter,
  isValid3Letter,
  findValid2LetterPlays
};
