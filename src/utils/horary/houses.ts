/**
 * House Meanings Registry and Question Analyzer for Horary Astrology
 * Based on William Lilly's traditional system ("Christian Astrology", 1647)
 *
 * Provides:
 * - Structured house meanings (extensible registry)
 * - Question analyzer: maps natural language questions to relevant houses
 * - LLM context formatter: injects question-specific house context into the prompt
 *
 * Architecture note: This is structured context engineering, not semantic RAG.
 * The domain is precise and discrete (12 houses, named planets, defined topics),
 * so deterministic keyword scoring is more reliable than vector similarity here.
 * As the knowledge corpus grows (e.g., Lilly texts), embedding-based retrieval
 * can be layered on top of this foundation.
 */

export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface HouseInfo {
  number: HouseNumber;
  name: string;
  primaryMeanings: string[];
  topics: string[];
  questionTypes: string[];
  commonDistinctions?: string[];
  derivativeNote?: string;
}

export interface DerivativeHouse {
  number: HouseNumber;
  label: string;
  baseHouse: HouseNumber;
  offset: number;
}

export interface QuestionAnalysis {
  primaryHouses: HouseNumber[];
  secondaryHouses: HouseNumber[];
  derivativeHouses: DerivativeHouse[];
  confidence: 'high' | 'medium' | 'low';
  detectedTopics: string[];
}

// --- House Registry ---
// Source of truth for house meanings. Add new topics/keywords here as the
// app encounters new question types. The LLM context formatter pulls from this.

export const HOUSES: Record<HouseNumber, HouseInfo> = {
  1: {
    number: 1,
    name: 'The Querent',
    primaryMeanings: [
      'The person asking the question',
      'Physical body and vitality',
      'Personal desires and intentions',
      'Beginning of the matter',
    ],
    topics: [
      'Querent\'s health (general constitution)',
      'Personal identity and appearance',
      'The querent\'s side of the story',
      'Early stages of any venture',
      'First impressions',
    ],
    questionTypes: [
      '"Will I...?" (any personal question)',
      '"Am I suited for...?"',
      '"How will I be affected by...?"',
    ],
    commonDistinctions: [
      '1st = general vitality and body; 6th = specific illness',
    ],
  },
  2: {
    number: 2,
    name: 'Moveable Possessions & Income',
    primaryMeanings: [
      'Money (cash, liquid assets)',
      'Moveable possessions (not real estate)',
      'Income and earnings',
      'Personal financial resources',
    ],
    topics: [
      'Salary, wages, financial gain or loss',
      'Lost or missing objects (moveable, valuable)',
      'Jewelry, electronics, personal items',
      'Bank account balances',
      'Financial security and support',
      'Borrowed money (when you are the lender)',
    ],
    questionTypes: [
      '"Will I get paid?"',
      '"Where is my lost [item]?"',
      '"Will I make money from...?"',
      '"Is this a good financial investment?"',
    ],
    commonDistinctions: [
      '2nd = moveable possessions and cash; 4th = real estate and land',
      '8th = partner\'s money (2nd from 7th)',
    ],
    derivativeNote: '2nd from any house = that person\'s money/resources (e.g., 8th = partner\'s money)',
  },
  3: {
    number: 3,
    name: 'Siblings, Neighbors & Short Journeys',
    primaryMeanings: [
      'Siblings (brothers and sisters)',
      'Neighbors and nearby people',
      'Short trips and local travel',
      'Communication (messages, calls, letters)',
      'Everyday vehicles',
    ],
    topics: [
      'Brothers and sisters (any age, biological or step)',
      'Cousins (close relatives of same generation)',
      'Neighborhood matters and local environment',
      'Written and digital communication (texts, emails)',
      'Short journeys (same-day, local)',
      'Cars, bicycles, and everyday transportation',
      'Contracts and informal agreements',
      'Gossip and rumors',
      'Learning and study (non-academic)',
    ],
    questionTypes: [
      '"How is my sister/brother doing?"',
      '"Will they reply to my message?"',
      '"Should I take this local trip?"',
      '"Will my neighbor cause problems?"',
      '"Is my car working properly?"',
    ],
    commonDistinctions: [
      '3rd = short trips (same-day, local); 9th = long journeys (overnight, foreign)',
      '3rd = siblings and close neighbors; 11th = friends (chosen, not proximity)',
      '3rd = informal communication; 9th = legal documents and publishing',
    ],
    derivativeNote: '3rd from any house = that person\'s siblings/neighbors',
  },
  4: {
    number: 4,
    name: 'Home, Land & Parents',
    primaryMeanings: [
      'Home and residence',
      'Real estate and land',
      'Father (traditionally, especially in day charts)',
      'Foundations and roots',
      'Endings of matters',
    ],
    topics: [
      'Houses, apartments, and properties',
      'Buying, selling, or renting real estate',
      'Land and soil',
      'Family home and ancestral heritage',
      'The end of any matter',
      'Buried or hidden things',
      'Foundations of buildings',
      'The querent\'s private life',
      'Retirement and endings',
    ],
    questionTypes: [
      '"Should I buy this house?"',
      '"Will I sell my property?"',
      '"Should I move?"',
      '"How is my father?"',
      '"Will this matter end well?"',
    ],
    commonDistinctions: [
      '4th = home/residence; 8th = shared resources and transformation',
      '4th = father (day charts); 10th = mother (some traditions)',
      '4th = the end/outcome of any matter',
    ],
    derivativeNote: '4th from any house = that person\'s home or father',
  },
  5: {
    number: 5,
    name: 'Romance, Children & Pleasure',
    primaryMeanings: [
      'Romance and love affairs (not marriage)',
      'Children and pregnancy',
      'Pleasure, entertainment, and fun',
      'Gambling and speculation',
      'Creativity and self-expression',
    ],
    topics: [
      'Dating, courtship, and romantic interest',
      'Biological or adopted children',
      'Pregnancy and conception',
      'Gambling, lotteries, and financial speculation',
      'Hobbies and leisure activities',
      'Parties and entertainment venues',
      'Creative projects and artistic expression',
      'Illicit or secret love affairs',
    ],
    questionTypes: [
      '"Does [person] have romantic feelings for me?"',
      '"Will I get pregnant?"',
      '"How is my child doing?"',
      '"Should I gamble on this?"',
      '"Will my creative project succeed?"',
    ],
    commonDistinctions: [
      '5th = romance, dating, love affairs; 7th = marriage and committed partnership',
      '5th = children and pregnancy; 11th = stepchildren',
      '5th = gambling/speculation; 2nd = general income and finances',
    ],
    derivativeNote: '5th from any house = that person\'s children or romantic life',
  },
  6: {
    number: 6,
    name: 'Illness, Employees & Daily Work',
    primaryMeanings: [
      'Illness and disease (current, acute)',
      'Employees, servants, and subordinates',
      'Daily work and routine tasks',
      'Small animals and pets',
      'Service rendered or received',
    ],
    topics: [
      'Current illness and specific symptoms',
      'Medical diagnosis and recovery',
      'Employees, staff, and hired help',
      'Daily work tasks and chores',
      'Pets (cats, dogs, and other small animals)',
      'Colleagues and coworkers',
      'Tenants (if querent is landlord)',
      'Uncles and aunts (father\'s siblings)',
    ],
    questionTypes: [
      '"What is causing my illness?"',
      '"Will I recover?"',
      '"Should I hire this person?"',
      '"Is my pet healthy?"',
      '"Will my tenant pay rent?"',
    ],
    commonDistinctions: [
      '6th = acute illness and disease; 1st = general constitution and vitality',
      '6th = daily work and tasks; 10th = career, profession, and employer',
      '6th = employees (subordinates); 7th = business partners (equals)',
      '6th = small animals (pets); 12th = large animals (horses, cattle)',
    ],
    derivativeNote: '6th from any house = that person\'s illness or daily work',
  },
  7: {
    number: 7,
    name: 'Partners, Opponents & "The Other"',
    primaryMeanings: [
      'Marriage partner and committed relationships',
      'Business partners (equals)',
      'Open enemies and known opponents',
      '"The other person" in any question',
      'Contracts and formal agreements',
    ],
    topics: [
      'Spouse, husband, or wife',
      'Committed romantic partner',
      'Business partner or co-founder',
      'Competitor, rival, or opponent',
      'Opponent in a lawsuit or conflict',
      'The thief in a lost-object question',
      'Any clearly identified "them" vs. "you"',
      'Astrologer (in questions about the reading itself)',
    ],
    questionTypes: [
      '"Will we get married?"',
      '"What does my partner think of me?"',
      '"Will I win the lawsuit?"',
      '"Is my business partner trustworthy?"',
      '"Will the other person agree?"',
    ],
    commonDistinctions: [
      '5th = romance and dating; 7th = marriage and committed partnership',
      '7th = open/known enemies; 12th = hidden and secret enemies',
      '7th = business partner (equal); 6th = employee (subordinate)',
      '7th = the other person in any situation',
    ],
    derivativeNote: '7th from any house = that person\'s partner or opponent',
  },
  8: {
    number: 8,
    name: 'Death, Inheritance & Shared Resources',
    primaryMeanings: [
      'Inheritance and legacies',
      'Other people\'s money and shared resources',
      'Debts, loans, and taxes',
      'Fear, anxiety, and transformation',
      'Death (traditional; use cautiously)',
    ],
    topics: [
      'Wills, estates, and inheritances',
      'Partner\'s finances (turned 2nd of 7th)',
      'Bank loans and mortgages',
      'Taxes, insurance, and shared accounts',
      'Money owed to the querent',
      'Surgery and deep physical transformation',
      'Fear and deep psychological states',
      'Occult practices and hidden knowledge',
    ],
    questionTypes: [
      '"Will I inherit money?"',
      '"Can my partner afford this?"',
      '"Will the bank approve my loan?"',
      '"Will I get the money owed to me?"',
    ],
    commonDistinctions: [
      '8th = inheritance and other people\'s money; 2nd = own money and possessions',
      '8th = partner\'s resources; 2nd = querent\'s own resources',
    ],
    derivativeNote: '8th from any house = that person\'s death, inheritance, or partner\'s money',
  },
  9: {
    number: 9,
    name: 'Long Journeys, Law & Higher Learning',
    primaryMeanings: [
      'Long journeys and foreign travel',
      'Law, courts, and legal matters',
      'Higher education (universities, advanced degrees)',
      'Religion, philosophy, and spirituality',
      'Publishing and broadcasting',
    ],
    topics: [
      'Trips requiring overnight stay or crossing borders',
      'International travel and immigration',
      'Foreigners and foreign cultures',
      'Lawyers, judges, and legal proceedings',
      'Universities, colleges, and postgraduate study',
      'Religion, church, and clergy',
      'Books, publishing, and broadcasting',
      'In-laws (partner\'s family: 3rd from 7th)',
      'Grandchildren (5th from 5th)',
      'Prophecy and divination',
    ],
    questionTypes: [
      '"Should I travel abroad?"',
      '"Will my lawsuit succeed?"',
      '"Will I get into graduate school?"',
      '"Should I publish this book?"',
      '"Will I emigrate successfully?"',
    ],
    commonDistinctions: [
      '9th = long journeys (overnight, foreign); 3rd = short trips (local, same-day)',
      '9th = higher education (university); 3rd = basic/early education',
      '9th = law and courts; 7th = the legal opponent',
    ],
    derivativeNote: '9th from any house = that person\'s long journeys or legal matters',
  },
  10: {
    number: 10,
    name: 'Career, Reputation & Authority',
    primaryMeanings: [
      'Career, profession, and vocation',
      'Employer, boss, and authority figures',
      'Reputation and public standing',
      'Honor, status, and achievement',
      'Mother (in some traditional systems)',
    ],
    topics: [
      'Job, profession, and career path',
      'Boss, supervisor, and employer',
      'Getting hired, promoted, or fired',
      'Public reputation and fame',
      'Kings, governments, presidents, and judges',
      'Professional standing and achievements',
      'Business reputation and success',
      'The outcome or result of a matter',
    ],
    questionTypes: [
      '"Will I get the job?"',
      '"Will I be promoted?"',
      '"What does my boss think of me?"',
      '"Will my business succeed?"',
      '"Will I become famous?"',
    ],
    commonDistinctions: [
      '10th = career and profession; 6th = daily work tasks',
      '10th = employer/boss; 6th = employees/subordinates',
      '10th = professional income (2nd from 10th = 11th); 2nd = general income',
    ],
    derivativeNote: '10th from any house = that person\'s career, reputation, or mother',
  },
  11: {
    number: 11,
    name: 'Friends, Hopes & Wishes',
    primaryMeanings: [
      'Friends and social connections',
      'Hopes, wishes, and aspirations',
      'Groups, organizations, and communities',
      'Benefactors and helpers',
      'Stepchildren',
    ],
    topics: [
      'Friends and acquaintances (chosen, social)',
      'Social groups, clubs, and associations',
      'People who support or help the querent',
      'Hopes and desires for the future',
      'Stepchildren or adopted children',
      'Advisors and counselors',
      'Income from career (2nd from 10th = 11th)',
    ],
    questionTypes: [
      '"Will my friend help me?"',
      '"Will I achieve my dream?"',
      '"Should I join this organization?"',
      '"Will my wish come true?"',
      '"How is my stepchild doing?"',
    ],
    commonDistinctions: [
      '11th = friends (social, chosen); 7th = committed partners',
      '11th = friends; 3rd = neighbors (proximity, not choice)',
      '11th = hopes and aspirations; 1st = the querent\'s current state',
    ],
    derivativeNote: '11th from any house = that person\'s friends or hopes',
  },
  12: {
    number: 12,
    name: 'Hidden Enemies, Confinement & Self-Undoing',
    primaryMeanings: [
      'Hidden and secret enemies',
      'Self-undoing and self-sabotage',
      'Confinement (prisons, hospitals, institutions)',
      'Isolation and secret activities',
      'Large animals (horses, cattle)',
    ],
    topics: [
      'Secret enemies and unknown adversaries',
      'Self-destructive behavior',
      'Prisons, jails, and detention',
      'Hospitals as places of confinement',
      'Secret love affairs (hidden from others)',
      'Occult practices and witchcraft',
      'Large animals (horses, cattle, elephants)',
      'Exile, banishment, and retreat',
      'Chronic and lingering illness',
      'Psychological shadow and hidden fears',
    ],
    questionTypes: [
      '"Who is secretly working against me?"',
      '"Will I go to prison?"',
      '"Is someone having a secret affair?"',
      '"Will my horse recover?"',
      '"Am I self-sabotaging?"',
    ],
    commonDistinctions: [
      '12th = hidden/secret enemies; 7th = open/known enemies',
      '12th = confinement and chronic suffering; 6th = illness (acute)',
      '12th = large animals (horses); 6th = small animals (pets)',
    ],
    derivativeNote: '12th from any house = that person\'s hidden enemies or confinement',
  },
};

// --- Question Keyword Scoring ---
// Each entry: regex pattern, house it signals, and weight (higher = stronger signal).
// Patterns are checked against the full question text (case-insensitive).
// Extend this array when new question types are encountered.

interface KeywordRule {
  pattern: RegExp;
  house: HouseNumber;
  weight: number;
  topic: string; // human-readable label for detectedTopics
}

const KEYWORD_RULES: KeywordRule[] = [
  // 1st House — querent, body, personal matters
  { pattern: /\bwill i\b/i, house: 1, weight: 1, topic: 'querent (1st)' },
  { pattern: /\bam i\b/i, house: 1, weight: 1, topic: 'querent (1st)' },
  { pattern: /\bmy (body|appearance|health|vitality|constitution)\b/i, house: 1, weight: 3, topic: 'querent body (1st)' },

  // 2nd House — money, possessions, lost objects
  { pattern: /\b(money|cash|finances|financial|salary|income|earn(?:ing|ings|ed)?|pay(?:ing|ment|ments|check|slip|ed|s)?|paid|afford|wealth|assets|valuables)\b/i, house: 2, weight: 3, topic: 'finances/money (2nd)' },
  { pattern: /\b(lost|missing|find|found|where is|where are)\b.{0,30}\b(item|object|thing|phone|wallet|keys|ring|watch|purse|bag|card|document)\b/i, house: 2, weight: 5, topic: 'lost object (2nd)' },
  { pattern: /\b(jewelry|jewellery|ring|necklace|bracelet)\b/i, house: 2, weight: 3, topic: 'valuables (2nd)' },
  { pattern: /\b(invest|investment|profit|gain|loss|savings|bank account)\b/i, house: 2, weight: 3, topic: 'finances/money (2nd)' },

  // 3rd House — siblings, neighbors, short trips, communication, vehicles
  { pattern: /\b(brother|sister|sibling|bro|sis)\b/i, house: 3, weight: 5, topic: 'sibling (3rd)' },
  { pattern: /\b(neighbor|neighbour|next.?door)\b/i, house: 3, weight: 4, topic: 'neighbor (3rd)' },
  { pattern: /\b(cousin)\b/i, house: 3, weight: 3, topic: 'cousin (3rd)' },
  { pattern: /\b(car|vehicle|bicycle|bike|commute|drive|driving)\b/i, house: 3, weight: 3, topic: 'vehicle/transport (3rd)' },
  { pattern: /\b(message|email|text|call|phone|communicate|communication|letter|respond|reply)\b/i, house: 3, weight: 3, topic: 'communication (3rd)' },
  { pattern: /\b(short trip|day trip|local travel|nearby|close by)\b/i, house: 3, weight: 4, topic: 'short journey (3rd)' },
  { pattern: /\b(rumors|gossip|news|information)\b/i, house: 3, weight: 2, topic: 'news/communication (3rd)' },

  // 4th House — home, real estate, father
  { pattern: /\b(home|house|apartment|flat|condo|property|real estate|land|move|moving|relocate|relocation)\b/i, house: 4, weight: 3, topic: 'home/property (4th)' },
  { pattern: /\b(father|dad|papa|pa)\b/i, house: 4, weight: 5, topic: 'father (4th)' },
  { pattern: /\b(buy|purchase|sell).{0,20}(home|house|property|apartment|flat)\b/i, house: 4, weight: 5, topic: 'real estate (4th)' },
  { pattern: /\b(rent|mortgage|landlord)\b/i, house: 4, weight: 3, topic: 'home/property (4th)' },

  // 5th House — romance, children, pregnancy, gambling, creativity
  { pattern: /\b(romance|romantic|date|dating|crush|love interest|feelings for me|like me)\b/i, house: 5, weight: 4, topic: 'romance (5th)' },
  { pattern: /\b(pregnant|pregnancy|baby|conceive|conception|fertility)\b/i, house: 5, weight: 5, topic: 'pregnancy/children (5th)' },
  { pattern: /\b(child|children|son|daughter|kid|kids)\b/i, house: 5, weight: 4, topic: 'children (5th)' },
  { pattern: /\b(gamble|gambling|lottery|bet|betting|speculation|speculate|stock)\b/i, house: 5, weight: 4, topic: 'gambling/speculation (5th)' },
  { pattern: /\b(creative|creativity|art|artwork|hobby|hobbies|fun|entertainment)\b/i, house: 5, weight: 2, topic: 'creativity/pleasure (5th)' },

  // 6th House — illness, employees, pets, daily work, colleagues
  { pattern: /\b(sick|ill|illness|disease|symptom|diagnose|diagnosis|heal|recover|recovery|health problem|condition|infection)\b/i, house: 6, weight: 4, topic: 'illness (6th)' },
  { pattern: /\b(employee|hire|hiring|fire|firing|staff|worker|servant|subordinate)\b/i, house: 6, weight: 4, topic: 'employees (6th)' },
  { pattern: /\b(pet|cat|dog|hamster|bird|animal|veterinarian|vet)\b/i, house: 6, weight: 4, topic: 'pet/small animal (6th)' },
  { pattern: /\b(colleague|coworker|co-worker|workmate)\b/i, house: 6, weight: 3, topic: 'colleague (6th)' },
  { pattern: /\b(daily work|chores|duties|obligations|routine)\b/i, house: 6, weight: 3, topic: 'daily work (6th)' },

  // 7th House — partner, marriage, opponents, contracts
  { pattern: /\b(partner|partnership|spouse|husband|wife|boyfriend|girlfriend)\b/i, house: 7, weight: 4, topic: 'partner (7th)' },
  { pattern: /\b(marry|marri(?:ed|age|es)|wedding|engaged|engagement|propos(?:e|ed|al))\b/i, house: 7, weight: 5, topic: 'marriage (7th)' },
  { pattern: /\b(lawsuit|sue|court|litigation|legal action|dispute)\b/i, house: 7, weight: 3, topic: 'lawsuit/opponent (7th)' },
  { pattern: /\b(opponent|rival|competitor|adversary|enemy)\b/i, house: 7, weight: 4, topic: 'opponent (7th)' },
  { pattern: /\b(contract|agreement|deal|negotiation)\b/i, house: 7, weight: 3, topic: 'contract (7th)' },
  { pattern: /\b(relationship|together|committed|commitment)\b/i, house: 7, weight: 2, topic: 'relationship (7th)' },

  // 8th House — inheritance, debt, shared money, death, fear
  { pattern: /\b(inherit|inheritance|inheriting|estate|legacy|bequest|last will)\b/i, house: 8, weight: 5, topic: 'inheritance (8th)' },
  { pattern: /\b(debt|loan|borrow|borrowed|credit|mortgage|owe|owed)\b/i, house: 8, weight: 4, topic: 'debt/loans (8th)' },
  { pattern: /\b(tax|taxes|insurance|benefit|pension)\b/i, house: 8, weight: 3, topic: 'shared resources (8th)' },
  { pattern: /\b(die|death|dying|terminal|fatal|mortality)\b/i, house: 8, weight: 3, topic: 'death (8th)' },
  { pattern: /\b(surgery|operation|procedure)\b/i, house: 8, weight: 3, topic: 'surgery (8th)' },

  // 9th House — foreign travel, law, higher education, religion, publishing
  { pattern: /\b(abroad|foreign|international|overseas|emigrate|emigration|immigrate|immigration|travel|trip).{0,20}(countr|city|land|place)\b/i, house: 9, weight: 4, topic: 'foreign travel (9th)' },
  { pattern: /\b(long (trip|journey|travel)|overseas trip|travel abroad)\b/i, house: 9, weight: 4, topic: 'long journey (9th)' },
  { pattern: /\b(lawyer|attorney|legal advice|barrister|solicitor|judge|court order)\b/i, house: 9, weight: 3, topic: 'law (9th)' },
  { pattern: /\b(university|college|degree|graduate|postgraduate|phd|masters|academia|academic)\b/i, house: 9, weight: 4, topic: 'higher education (9th)' },
  { pattern: /\b(religion|church|spiritual|spirituality|faith|belief|philosophy|theology)\b/i, house: 9, weight: 3, topic: 'religion/philosophy (9th)' },
  { pattern: /\b(publish|publishing|book|author|broadcast|media)\b/i, house: 9, weight: 3, topic: 'publishing (9th)' },
  { pattern: /\b(in.?law|in-laws|mother.?in.?law|father.?in.?law|sister.?in.?law|brother.?in.?law)\b/i, house: 9, weight: 4, topic: 'in-laws (9th, 3rd from 7th)' },

  // 10th House — career, employer, reputation, promotion
  { pattern: /\b(job|career|work|profession|vocation|occupation)\b/i, house: 10, weight: 3, topic: 'career (10th)' },
  { pattern: /\b(boss|employer|manager|supervisor|authority|director|ceo)\b/i, house: 10, weight: 4, topic: 'employer/boss (10th)' },
  { pattern: /\b(promot(?:e|ed|ion|ions|ing)|raise|demotion|fired|sacked|laid off|hired)\b/i, house: 10, weight: 4, topic: 'career advancement (10th)' },
  { pattern: /\b(reputation|fame|famous|public|status|recognition|honor|honour)\b/i, house: 10, weight: 3, topic: 'reputation (10th)' },
  { pattern: /\b(business|company|enterprise|startup|firm)\b/i, house: 10, weight: 2, topic: 'business/career (10th)' },
  { pattern: /\b(mother|mom|mum|mama)\b/i, house: 10, weight: 3, topic: 'mother (10th)' },

  // 11th House — friends, hopes, groups, wishes
  { pattern: /\b(friend|friends|friendship|pal|buddy)\b/i, house: 11, weight: 4, topic: 'friend (11th)' },
  { pattern: /\b(group|club|organization|organisation|association|community|society|network)\b/i, house: 11, weight: 3, topic: 'group/organization (11th)' },
  { pattern: /\b(wish|hope|dream|aspiration|aspire|goal|desire)\b/i, house: 11, weight: 3, topic: 'hopes/wishes (11th)' },
  { pattern: /\b(stepchild|step.?child|stepdaughter|stepson)\b/i, house: 11, weight: 4, topic: 'stepchild (11th)' },

  // 12th House — hidden enemies, secrets, confinement, large animals
  { pattern: /\b(secret|secretly|hidden|unknown|anonymous)\b/i, house: 12, weight: 3, topic: 'secrets (12th)' },
  { pattern: /\b(prison|jail|incarcerat|detained|locked up|arrested)\b/i, house: 12, weight: 5, topic: 'confinement (12th)' },
  { pattern: /\b(hospital|confined|institutionalized)\b/i, house: 12, weight: 4, topic: 'confinement (12th)' },
  { pattern: /\b(hidden enemy|secret enemy|sabotage|saboteur)\b/i, house: 12, weight: 5, topic: 'hidden enemies (12th)' },
  { pattern: /\b(horse|horses|cattle|cow|elephant|large animal)\b/i, house: 12, weight: 4, topic: 'large animals (12th)' },
  { pattern: /\b(self.?undoing|self.?sabotage|self.?sabotaging)\b/i, house: 12, weight: 5, topic: 'self-undoing (12th)' },
];

// Derivative house patterns: "my [person]'s [topic]"
// Detects a subject keyword (maps to a base house) and a topic keyword (maps to an offset)
// The resulting derivative house number = (baseHouse + offset - 1) % 12 + 1

interface DerivativeSubject {
  pattern: RegExp;
  house: HouseNumber;
  label: string;
}

interface DerivativeTopic {
  pattern: RegExp;
  offset: number; // houses counted from the subject's house (1-based, so +0 = same house)
  label: string;
}

const DERIVATIVE_SUBJECTS: DerivativeSubject[] = [
  { pattern: /\b(sister|brother|sibling|bro|sis|cousin)\b/i, house: 3, label: 'sibling' },
  { pattern: /\b(father|dad|papa)\b/i, house: 4, label: 'father' },
  { pattern: /\b(child|children|son|daughter|kid)\b/i, house: 5, label: 'child' },
  { pattern: /\b(mother|mom|mum|mama)\b/i, house: 10, label: 'mother' },
  { pattern: /\b(partner|spouse|husband|wife|boyfriend|girlfriend)\b/i, house: 7, label: 'partner' },
  { pattern: /\b(friend)\b/i, house: 11, label: 'friend' },
  { pattern: /\b(boss|employer|manager|supervisor)\b/i, house: 10, label: 'boss' },
];

const DERIVATIVE_TOPICS: DerivativeTopic[] = [
  { pattern: /\b(money|income|salary|finances|earn|afford|wealth|assets)\b/i, offset: 1, label: 'money (2nd from)' },
  { pattern: /\b(career|job|work|profession|promotion|employment)\b/i, offset: 9, label: 'career (10th from)' },
  { pattern: /\b(health|sick|illness|disease|recover)\b/i, offset: 5, label: 'health (6th from)' },
  { pattern: /\b(home|house|property|live|living)\b/i, offset: 3, label: 'home (4th from)' },
  { pattern: /\b(partner|spouse|relationship|love)\b/i, offset: 6, label: 'partner (7th from)' },
  { pattern: /\b(child|children|baby|pregnant)\b/i, offset: 4, label: 'children (5th from)' },
  { pattern: /\b(friend)\b/i, offset: 10, label: 'friends (11th from)' },
];

function computeDerivativeHouse(base: HouseNumber, offset: number): HouseNumber {
  return (((base - 1 + offset) % 12) + 1) as HouseNumber;
}

// --- Question Analyzer ---

export function analyzeQuestion(question: string): QuestionAnalysis {
  const scores = new Array(13).fill(0) as number[]; // index 1-12
  const detectedTopicsSet = new Set<string>();

  // Score each house by keyword matches
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(question)) {
      scores[rule.house] += rule.weight;
      detectedTopicsSet.add(rule.topic);
    }
  }

  // Detect derivative houses
  const derivativeHouses: DerivativeHouse[] = [];
  for (const subject of DERIVATIVE_SUBJECTS) {
    if (subject.pattern.test(question)) {
      for (const topic of DERIVATIVE_TOPICS) {
        if (topic.pattern.test(question)) {
          const derivHouse = computeDerivativeHouse(subject.house, topic.offset);
          const label = `${subject.label}'s ${topic.label} = ${ordinalHouse(derivHouse)}`;
          // Avoid duplicates
          if (!derivativeHouses.some(d => d.number === derivHouse && d.baseHouse === subject.house)) {
            derivativeHouses.push({
              number: derivHouse,
              label,
              baseHouse: subject.house,
              offset: topic.offset,
            });
            // Add the derivative house to scores (lower weight)
            scores[derivHouse] += 3;
            scores[subject.house] += 2;
            detectedTopicsSet.add(`${subject.label} derivative (${label})`);
          }
        }
      }
    }
  }

  // Rank houses by score (excluding index 0)
  const ranked = (scores
    .map((score, house) => ({ house: house as HouseNumber, score }))
    .filter(x => x.house >= 1 && x.house <= 12 && x.score > 0)
    .sort((a, b) => b.score - a.score));

  const maxScore = ranked[0]?.score ?? 0;
  const threshold = maxScore * 0.4; // secondary houses score at least 40% of top

  const primaryHouses = ranked
    .filter(x => x.score >= maxScore * 0.75)
    .slice(0, 2)
    .map(x => x.house);

  const secondaryHouses = ranked
    .filter(x => x.score < maxScore * 0.75 && x.score >= threshold && x.score > 0)
    .slice(0, 2)
    .map(x => x.house)
    .filter(h => !primaryHouses.includes(h));

  let confidence: 'high' | 'medium' | 'low';
  if (maxScore >= 5) {
    confidence = 'high';
  } else if (maxScore >= 2) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    primaryHouses: primaryHouses.length > 0 ? primaryHouses : [],
    secondaryHouses,
    derivativeHouses,
    confidence,
    detectedTopics: Array.from(detectedTopicsSet),
  };
}

// --- LLM Context Formatter ---

function ordinalHouse(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0];
  return `${n}${suffix} house`;
}

/**
 * Formats question-specific house context for injection into the LLM prompt.
 * Call this from formatChartForLLMWithMotion() and append the result to the chart data string.
 *
 * The returned section header is "### Relevant House Context" so the system prompt
 * can reference it by name.
 */
export function formatHouseContextForLLM(question: string, analysis: QuestionAnalysis): string {
  if (analysis.confidence === 'low' && analysis.primaryHouses.length === 0) {
    return `\n### Relevant House Context:\n` +
      `Unable to identify specific house from question. ` +
      `Use the question text and traditional house meanings to determine the relevant significators.\n`;
  }

  let out = `\n### Relevant House Context for This Question:\n`;

  // Detected topics summary
  if (analysis.detectedTopics.length > 0) {
    out += `**Detected topics:** ${analysis.detectedTopics.join(', ')}\n`;
  }

  // Primary houses
  if (analysis.primaryHouses.length > 0) {
    out += `**Primary house(s) for this question:** ${analysis.primaryHouses.map(ordinalHouse).join(', ')}\n`;
  }
  if (analysis.secondaryHouses.length > 0) {
    out += `**Supporting house(s):** ${analysis.secondaryHouses.map(ordinalHouse).join(', ')}\n`;
  }

  out += `\n`;

  // Full context for each relevant house (primary + secondary, deduplicated, skip 1st if only house)
  const allRelevant = [...new Set([...analysis.primaryHouses, ...analysis.secondaryHouses])];

  // Always skip injecting 1st house alone — the system prompt already covers it thoroughly.
  const housesToExpand = allRelevant.filter(h => !(h === 1 && allRelevant.length === 1));

  for (const houseNum of housesToExpand) {
    const h = HOUSES[houseNum];
    const isPrimary = analysis.primaryHouses.includes(houseNum);
    out += `**${ordinalHouse(houseNum)} — ${h.name}** ${isPrimary ? '(primary)' : '(supporting)'}:\n`;
    out += `- Primary meanings: ${h.primaryMeanings.join('; ')}\n`;
    out += `- Specific topics: ${h.topics.join('; ')}\n`;
    if (h.commonDistinctions && h.commonDistinctions.length > 0) {
      out += `- Key distinctions: ${h.commonDistinctions.join(' | ')}\n`;
    }
    if (h.derivativeNote) {
      out += `- Derivative use: ${h.derivativeNote}\n`;
    }
    out += `\n`;
  }

  // Derivative house guidance
  if (analysis.derivativeHouses.length > 0) {
    out += `**Derivative house(s) detected:**\n`;
    for (const dh of analysis.derivativeHouses) {
      out += `- ${dh.label}\n`;
    }
    out += `\n`;
  }

  return out;
}
