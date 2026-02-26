import { describe, it, expect } from 'vitest';
import {
  HOUSES,
  analyzeQuestion,
  formatHouseContextForLLM,
} from '../houses';
import type { HouseNumber, QuestionAnalysis } from '../houses';

// --- House Registry ---

describe('HOUSES registry', () => {
  it('should have entries for all 12 houses', () => {
    for (let i = 1; i <= 12; i++) {
      expect(HOUSES[i as HouseNumber]).toBeDefined();
      expect(HOUSES[i as HouseNumber].number).toBe(i);
    }
  });

  it('each house should have required fields', () => {
    for (let i = 1; i <= 12; i++) {
      const h = HOUSES[i as HouseNumber];
      expect(h.name).toBeTruthy();
      expect(Array.isArray(h.primaryMeanings)).toBe(true);
      expect(h.primaryMeanings.length).toBeGreaterThan(0);
      expect(Array.isArray(h.topics)).toBe(true);
      expect(h.topics.length).toBeGreaterThan(0);
      expect(Array.isArray(h.questionTypes)).toBe(true);
    }
  });

  it('house 7 should cover marriage and partnership', () => {
    const h7 = HOUSES[7];
    const allText = [...h7.primaryMeanings, ...h7.topics].join(' ').toLowerCase();
    expect(allText).toContain('marriage');
    expect(allText).toContain('partner');
  });

  it('house 3 should cover siblings and communication', () => {
    const h3 = HOUSES[3];
    const allText = [...h3.primaryMeanings, ...h3.topics].join(' ').toLowerCase();
    expect(allText).toContain('sibling');
    expect(allText).toContain('communication');
  });
});

// --- Question Analyzer ---

describe('analyzeQuestion', () => {
  describe('marriage / relationship questions', () => {
    it('detects 7th house for marriage question', () => {
      const result = analyzeQuestion('Will we get married?');
      expect(result.primaryHouses).toContain(7);
    });

    it('detects 7th house for relationship commitment question', () => {
      const result = analyzeQuestion('Will my boyfriend propose to me?');
      expect(result.primaryHouses).toContain(7);
    });

    it('detects 5th house for romance/dating question', () => {
      const result = analyzeQuestion('Does he have romantic feelings for me?');
      expect(result.primaryHouses).toContain(5);
    });
  });

  describe('career questions', () => {
    it('detects 10th house for job question', () => {
      const result = analyzeQuestion('Will I get the job?');
      expect(result.primaryHouses).toContain(10);
    });

    it('detects 10th house for promotion question', () => {
      const result = analyzeQuestion('Will I be promoted at work?');
      expect(result.primaryHouses).toContain(10);
    });

    it('detects 10th house for boss question', () => {
      const result = analyzeQuestion('What does my boss think of me?');
      expect(result.primaryHouses).toContain(10);
    });
  });

  describe('financial questions', () => {
    it('detects 2nd house for money question', () => {
      const result = analyzeQuestion('Will I get paid this month?');
      expect(result.primaryHouses).toContain(2);
    });

    it('detects 2nd house for lost object question', () => {
      const result = analyzeQuestion('Where is my lost wallet?');
      expect(result.primaryHouses).toContain(2);
    });

    it('detects 8th house for inheritance question', () => {
      const result = analyzeQuestion('Will I inherit money from my aunt?');
      expect(result.primaryHouses).toContain(8);
    });
  });

  describe('health questions', () => {
    it('detects 6th house for illness question', () => {
      const result = analyzeQuestion('Will I recover from this illness?');
      expect(result.primaryHouses).toContain(6);
    });

    it('detects 6th house for pet health question', () => {
      const result = analyzeQuestion('Is my dog healthy?');
      expect(result.primaryHouses).toContain(6);
    });
  });

  describe('property questions', () => {
    it('detects 4th house for home purchase question', () => {
      const result = analyzeQuestion('Should I buy this house?');
      expect(result.primaryHouses).toContain(4);
    });

    it('detects 4th house for moving question', () => {
      const result = analyzeQuestion('Should I move to a new apartment?');
      expect(result.primaryHouses).toContain(4);
    });
  });

  describe('sibling questions', () => {
    it('detects 3rd house for sibling question', () => {
      const result = analyzeQuestion('How is my sister doing?');
      expect(result.primaryHouses).toContain(3);
    });

    it('detects 3rd house for brother question', () => {
      const result = analyzeQuestion('Will my brother get the job?');
      expect(result.primaryHouses).toContain(3);
    });
  });

  describe('travel questions', () => {
    it('detects 9th house for foreign travel', () => {
      const result = analyzeQuestion('Should I travel abroad next year?');
      expect(result.primaryHouses).toContain(9);
    });

    it('detects 9th house for university question', () => {
      const result = analyzeQuestion('Will I get into graduate school?');
      expect(result.primaryHouses).toContain(9);
    });
  });

  describe('friend and social questions', () => {
    it('detects 11th house for friend question', () => {
      const result = analyzeQuestion('Will my friend help me?');
      expect(result.primaryHouses).toContain(11);
    });
  });

  describe('hidden enemy / secret questions', () => {
    it('detects 12th house for hidden enemy question', () => {
      const result = analyzeQuestion('Who is the hidden enemy working against me?');
      expect(result.primaryHouses).toContain(12);
    });
  });

  describe('derivative house detection', () => {
    it('detects sibling career as derivative of 3rd (10th from 3rd = 12th)', () => {
      const result = analyzeQuestion("Will my sister get the job?");
      expect(result.derivativeHouses.length).toBeGreaterThan(0);
      const derived = result.derivativeHouses.find(d => d.baseHouse === 3);
      expect(derived).toBeDefined();
      // 10th from 3rd = house 12
      expect(derived?.number).toBe(12);
    });

    it('detects partner money as derivative (2nd from 7th = 8th)', () => {
      const result = analyzeQuestion("Can my partner afford this?");
      const derived = result.derivativeHouses.find(d => d.baseHouse === 7 && d.offset === 1);
      expect(derived).toBeDefined();
      expect(derived?.number).toBe(8);
    });
  });

  describe('confidence levels', () => {
    it('returns high confidence for strong keyword matches', () => {
      const result = analyzeQuestion('Will I get the job promotion?');
      expect(result.confidence).toBe('high');
    });

    it('returns low confidence for ambiguous question', () => {
      const result = analyzeQuestion('What will happen?');
      expect(result.confidence).toBe('low');
    });
  });

  describe('detectedTopics', () => {
    it('populates detectedTopics from keyword matches', () => {
      const result = analyzeQuestion('Will I get the job?');
      expect(result.detectedTopics.length).toBeGreaterThan(0);
    });
  });
});

// --- LLM Context Formatter ---

describe('formatHouseContextForLLM', () => {
  it('returns a string with section header', () => {
    const analysis: QuestionAnalysis = {
      primaryHouses: [10],
      secondaryHouses: [2],
      derivativeHouses: [],
      confidence: 'high',
      detectedTopics: ['career (10th)'],
    };
    const out = formatHouseContextForLLM('Will I get the job?', analysis);
    expect(out).toContain('### Relevant House Context');
    expect(out).toContain('10th');
    expect(out).toContain('Career');
  });

  it('includes primary and secondary house details', () => {
    const analysis: QuestionAnalysis = {
      primaryHouses: [7],
      secondaryHouses: [5],
      derivativeHouses: [],
      confidence: 'high',
      detectedTopics: ['marriage (7th)', 'romance (5th)'],
    };
    const out = formatHouseContextForLLM('Will we get married?', analysis);
    expect(out).toContain('7th');
    expect(out).toContain('Partners');
    expect(out).toContain('5th');
    expect(out).toContain('Romance');
  });

  it('includes derivative house guidance when detected', () => {
    const analysis: QuestionAnalysis = {
      primaryHouses: [3],
      secondaryHouses: [],
      derivativeHouses: [
        { number: 12, label: "sibling's career (10th from 3rd) = 12th house", baseHouse: 3, offset: 9 },
      ],
      confidence: 'high',
      detectedTopics: ['sibling (3rd)'],
    };
    const out = formatHouseContextForLLM("Will my sister get the job?", analysis);
    expect(out).toContain('Derivative house');
    expect(out).toContain("sibling's career");
  });

  it('handles low confidence with fallback message', () => {
    const analysis: QuestionAnalysis = {
      primaryHouses: [],
      secondaryHouses: [],
      derivativeHouses: [],
      confidence: 'low',
      detectedTopics: [],
    };
    const out = formatHouseContextForLLM('What will happen?', analysis);
    expect(out).toContain('### Relevant House Context');
    expect(out).toContain('Unable to identify');
  });

  it('does not inject 1st house context when it is the only house', () => {
    const analysis: QuestionAnalysis = {
      primaryHouses: [1],
      secondaryHouses: [],
      derivativeHouses: [],
      confidence: 'medium',
      detectedTopics: ['querent (1st)'],
    };
    const out = formatHouseContextForLLM('Will I be okay?', analysis);
    // Should still have the header but not expand 1st house details
    expect(out).toContain('### Relevant House Context');
    expect(out).not.toContain('Primary meanings:');
  });

  it('marks primary houses as (primary) and secondary as (supporting)', () => {
    const analysis: QuestionAnalysis = {
      primaryHouses: [10],
      secondaryHouses: [2],
      derivativeHouses: [],
      confidence: 'high',
      detectedTopics: ['career (10th)', 'finances/money (2nd)'],
    };
    const out = formatHouseContextForLLM('Will I get the job and a raise?', analysis);
    expect(out).toContain('(primary)');
    expect(out).toContain('(supporting)');
  });
});
