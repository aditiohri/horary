# House Meanings - Comprehensive Reference

**Purpose:** This document serves as the authoritative reference for house meanings in horary astrology. Use it to:
1. Identify which house rules specific topics when users ask questions
2. Update the LLM system prompt as new use cases emerge
3. Maintain consistency across readings

**Last Updated:** February 22, 2025

---

## How to Use This Document

### When a user asks about a topic not clearly covered:
1. Research the traditional horary association (consult Lilly, etc.)
2. Add it to the appropriate house section below
3. Update the condensed version in `/src/utils/llm.ts` (HORARY_SYSTEM_PROMPT section)
4. Commit with message: `docs: add [topic] to [house] meanings`

### Balancing detail vs. token count:
- **This file:** Comprehensive, all associations, examples
- **LLM prompt:** Condensed version highlighting most common topics
- Update prompt only when a significant gap causes misreadings

---

## First House - The Querent

**Primary Meanings:**
- The person asking the question (querent)
- Physical body and appearance
- Vitality and life force
- Personal desires and intentions
- Beginning of the matter

**Specific Topics:**
- Health (general constitution, when not illness-specific - use 6th for illness)
- Personal identity
- First impressions
- Early stages of any venture
- The querent's perspective/side of the story

**Questions Where 1st House is Significator:**
- "Will I...?" (any personal question)
- "Am I suited for...?"
- "How will I be affected by...?"

**Traditional Note:** Always represents the querent, even if they're asking about someone else. The ruler of the 1st + Moon are co-significators of the querent.

---

## Second House - Moveable Possessions & Income

**Primary Meanings:**
- Money (cash, liquid assets)
- Moveable possessions (not real estate)
- Income and earnings
- Personal resources
- What you value

**Specific Topics:**
- Salary, wages, financial gain/loss
- Lost objects (if moveable and valuable)
- Jewelry, electronics, personal items
- Bank accounts (the money itself, not the institution)
- Financial security
- Borrowed money (when you're the lender)
- Support from the quesited (turned 8th of 7th)

**Questions Where 2nd House is Significator:**
- "Will I get paid?"
- "Where is my [lost item]?"
- "Will I make money from...?"
- "Is this a good financial investment?"

**Derivative Houses:**
- 2nd from any house = that person's money/resources
- Example: 8th house = partner's money (2nd from 7th)

---

## Third House - Siblings, Neighbors, Short Journeys

**Primary Meanings:**
- **SIBLINGS** (brothers, sisters - biological or step)
- Neighbors (people living nearby)
- Short trips (local, day trips, commutes)
- Communication (letters, emails, messages, rumors)
- Early education (elementary school, basic learning)
- Vehicles (cars, bicycles, local transport)

**Specific Topics:**
- Brothers and sisters (any age)
- Cousins (extended to include close relatives of your generation)
- Neighborhood matters
- Local environment
- Written communication
- Contracts and documents (shared with 9th for legal documents)
- Short journeys (under ~100 miles, same-day return)
- Everyday transportation
- SMS, emails, phone calls
- Gossip and rumors
- Learning and study (non-academic)

**Questions Where 3rd House is Significator:**
- "How is my sister doing?"
- "Will my brother get the job?" (use 3rd for sibling, 10th from 3rd for their career)
- "Should I take this short trip?"
- "Will my neighbor cause problems?"
- "Will they respond to my message?"
- "Is my car working properly?" (car itself)

**Derivative Houses:**
- 3rd from any house = that person's siblings/neighbors
- Example: 9th house = partner's siblings (3rd from 7th)

**Common Mistakes to Avoid:**
- ❌ Confusing with 9th house (long journeys)
- ❌ Missing sibling questions - ALWAYS check 3rd house ruler when siblings mentioned
- ❌ Using 11th for cousins (use 3rd for close cousins, 11th for distant)

---

## Fourth House - Home, Land, Parents

**Primary Meanings:**
- Home and residence
- Real estate and land
- Parents (especially father in day charts, mother in night charts)
- Foundations (literal and metaphorical)
- Endings of matters
- What is hidden or buried
- Ancestral heritage

**Specific Topics:**
- Houses, apartments, property
- Land and real estate
- Father (traditionally)
- The grave (endings)
- Mines, buried treasures, wells
- Foundations of buildings
- The end of life
- Retirement
- Hidden things underground
- Family roots and ancestry
- The querent's private life

**Questions Where 4th House is Significator:**
- "Should I buy this house?"
- "Will I sell my property?"
- "How is my father's health?" (use 6th from 4th for father's health)
- "What's buried in my yard?"
- "Will this matter end well?" (turned 10th of 7th = outcome of partner's action)

**Derivative Houses:**
- 4th from any house = that person's home/parents
- 10th from any house = that person's mother (opposite 4th)

---

## Fifth House - Romance, Children, Pleasure

**Primary Meanings:**
- Romance and love affairs (not marriage - use 7th)
- Children (biological or adopted)
- Pregnancy
- Pleasure and entertainment
- Gambling and speculation
- Creativity and self-expression
- Parties and celebrations

**Specific Topics:**
- Dating, courtship, romantic interest
- Children (sons, daughters)
- Pregnancy and conception
- Gambling, lotteries, stock speculation
- Hobbies and fun activities
- Parties, entertainment venues
- Creative projects
- Love tokens and gifts from lovers
- Illicit affairs (if romantic, not just sexual)
- Taverns, theaters, places of amusement

**Questions Where 5th House is Significator:**
- "Does [person] have romantic feelings for me?"
- "Will I get pregnant?"
- "How is my child doing?"
- "Should I gamble on this?"
- "Will my creative project succeed?"

**Derivative Houses:**
- 5th from any house = that person's children/romance
- Example: 11th house = partner's children (5th from 7th)

**Common Distinctions:**
- 5th = romance, dating, love affairs
- 7th = marriage, committed partnership
- 8th = sex, physical intimacy (separate from romance)

---

## Sixth House - Illness, Employees, Service

**Primary Meanings:**
- Illness and disease (acute, current health problems)
- Employees and servants
- Daily work (not career - use 10th)
- Service rendered or received
- Small animals (pets like cats, dogs)
- Tenants (if you're the landlord)
- Obligations and duties

**Specific Topics:**
- Current illness and symptoms
- Doctors and healers (as service providers)
- Employees, subordinates, staff
- Daily tasks and chores
- Domestic servants
- Pets (small animals under your care)
- Uncles and aunts (father's siblings)
- Renters/tenants (turned 10th of 9th)

**Questions Where 6th House is Significator:**
- "What's causing my illness?"
- "Will I recover from this disease?"
- "Should I hire this employee?"
- "Is my pet healthy?"
- "Will my tenant pay rent?"

**Derivative Houses:**
- 6th from any house = that person's illness/servants
- Example: 12th house = partner's illness (6th from 7th)

**Common Distinctions:**
- 6th = illness, daily work, employees
- 10th = career, profession, employer
- 1st = general constitution and vitality

---

## Seventh House - Partners, Opponents, "The Other"

**Primary Meanings:**
- Marriage partner and committed relationships
- Business partners
- Open enemies and opponents
- "The other person" in any question
- Contracts and agreements
- Lawsuits (the opponent)
- Any person clearly defined and known

**Specific Topics:**
- Spouse, husband, wife
- Business partner
- Competitor, rival
- Opponent in court
- The person you're in conflict with
- Astrologer (in questions about the reading itself)
- Thief (in lost object questions)
- Doctor (when they're treating you, not as employee)
- Any clearly identified "them" vs. "you"

**Questions Where 7th House is Significator:**
- "Will we get married?"
- "What does my partner think of me?"
- "Will my business partner betray me?"
- "Will I win the lawsuit?" (opponent is 7th)
- "Who stole my item?" (thief is 7th)

**Derivative Houses:**
- 7th from any house = that person's partner/opponent
- Example: 1st house = your partner's partner (you, from their perspective)

**Common Distinctions:**
- 5th = romantic interest, dating
- 7th = committed partner, marriage, defined relationship
- 11th = friends (casual, social)

---

## Eighth House - Death, Inheritance, Shared Resources

**Primary Meanings:**
- Death (physical and metaphorical endings)
- Inheritance and legacies
- Other people's money (partner's money, loans, debts)
- Taxes and insurance
- Fear and anxiety
- Transformation
- Occult and hidden knowledge
- Sex (physical act, separate from romance)

**Specific Topics:**
- Death and dying
- Wills and estates
- Partner's finances (turned 2nd of 7th)
- Money owed to you
- Loans from banks
- Dowry and marriage settlements
- Taxes, duties, debts
- Fear, terror, anguish
- Surgery and deep healing
- Occult practices, magic
- Sexual encounters (physical, not romantic)

**Questions Where 8th House is Significator:**
- "Will I inherit money?"
- "Will they die?" (use cautiously, traditionally avoided)
- "Can my partner afford this?"
- "Will the bank approve my loan?"
- "What am I afraid of?"

**Derivative Houses:**
- 8th from any house = that person's death/inheritance/partner's money

**Ethical Note:** Traditional horary avoids death predictions. Use 8th house for inheritance, partner's resources, fears instead.

---

## Ninth House - Long Journeys, Law, Higher Learning

**Primary Meanings:**
- Long journeys and foreign travel
- Foreign countries and people
- Law, courts, legal matters
- Higher education (college, university)
- Religion and spirituality
- Philosophy and wisdom
- Publishing and broadcasting
- Dreams and visions (prophetic)

**Specific Topics:**
- Trips over ~100 miles or requiring overnight stay
- International travel
- Foreigners and immigrants
- Legal cases and lawsuits (the law itself, not opponent)
- Lawyers and judges
- Universities, colleges, advanced degrees
- Churches, temples, clergy
- Books and publishing
- Prophecy and divination
- In-laws (partner's family, turned 3rd of 7th)
- Grandchildren (turned 5th of 5th)

**Questions Where 9th House is Significator:**
- "Should I take this trip abroad?"
- "Will my lawsuit succeed?" (9th = law, 10th = judge, 7th = opponent)
- "Will I get into graduate school?"
- "Should I publish this book?"
- "Will I immigrate successfully?"

**Derivative Houses:**
- 9th from any house = that person's long journeys/legal matters
- 3rd from 7th = partner's siblings (your in-laws)

**Common Distinctions:**
- 3rd = short trips, neighbors, basic education
- 9th = long journeys, foreign, higher education

---

## Tenth House - Career, Reputation, Authority

**Primary Meanings:**
- Career and profession
- Employer, boss, authority figures
- Reputation and public standing
- Honor and status
- Mother (in some traditions)
- Kings, governments, judges
- The outcome or result of the matter

**Specific Topics:**
- Job, profession, vocation
- Your boss, supervisor, employer
- Public reputation and fame
- Career advancement, promotion
- Kings, presidents, authorities
- Judges (in legal cases)
- Mother (especially in night charts)
- The result of the matter (turned 4th = end of matter)
- Person in power over you

**Questions Where 10th House is Significator:**
- "Will I get the job?"
- "Will I be promoted?"
- "Will my business succeed?" (business itself, reputation)
- "What does my boss think of me?"
- "Will I become famous?"

**Derivative Houses:**
- 10th from any house = that person's career/mother/reputation
- Example: 4th house = partner's career (10th from 7th)

**Common Distinctions:**
- 6th = daily work, job tasks
- 10th = career, professional identity, employer
- 2nd = income from work

---

## Eleventh House - Friends, Hopes, Wishes

**Primary Meanings:**
- Friends (social, not intimate)
- Hopes, wishes, aspirations
- Groups and organizations
- Benefactors and helpers
- Step-children
- Money from profession (turned 2nd of 10th)
- The king's wealth and treasury

**Specific Topics:**
- Friends and acquaintances (casual)
- Social groups, clubs, associations
- People who help you
- Your wishes and desires (things you hope for)
- Step-children (not biological)
- Adopted children (in some traditions)
- Income from career (turned 2nd of 10th)
- Advisors and counselors
- Hopes for the future

**Questions Where 11th House is Significator:**
- "Will my friend help me?"
- "Will I achieve my dream?"
- "Should I join this organization?"
- "Will my wish come true?"
- "How is my stepchild doing?"

**Derivative Houses:**
- 11th from any house = that person's friends/hopes
- Example: 5th house = partner's friends (11th from 7th)

**Common Distinctions:**
- 5th = romantic interest
- 7th = committed partner
- 11th = friends, social connections
- 3rd = neighbors (proximity, not choice)

---

## Twelfth House - Hidden Enemies, Confinement, Self-Undoing

**Primary Meanings:**
- Hidden enemies (secret, unknown)
- Self-undoing and self-sabotage
- Confinement (prisons, hospitals, institutions)
- Isolation and solitude
- Secret affairs and hidden activities
- Large animals (horses, cattle)
- Suffering and sorrow
- The occult and mysticism
- Monasteries and retreat

**Specific Topics:**
- Secret enemies, unknown adversaries
- Self-destructive behavior
- Prisons, jails, asylums
- Hospitals (as places of confinement)
- Monks, hermits, solitary people
- Secret love affairs (hidden, not just romantic)
- Witchcraft and occult practices
- Large animals (horses, cows, elephants)
- Exile and banishment
- Chronic illness (lingering suffering)
- Things done in secret
- Psychological shadow

**Questions Where 12th House is Significator:**
- "Who is secretly working against me?"
- "Will I go to prison?"
- "Should I retreat from society?"
- "Is someone having a secret affair?"
- "Will my horse recover?" (large animal)

**Derivative Houses:**
- 12th from any house = that person's hidden enemies/confinement
- Example: 6th house = partner's hidden enemies (12th from 7th)

**Common Distinctions:**
- 7th = open enemies (known)
- 12th = hidden enemies (secret)
- 6th = illness (acute)
- 12th = chronic suffering, self-undoing

---

## Derivative Houses (Turned Houses)

When asking about another person's affairs, count houses from their significator:

**Example: "Will my sister get the job?"**
- Sister = 3rd house ruler (siblings)
- Her career = 10th from 3rd = 12th house
- Her employer = 10th from 3rd = 12th house ruler
- Her income from job = 2nd from 3rd = 4th house

**Example: "How is my partner's mother?"**
- Partner = 7th house ruler
- Partner's mother = 10th from 7th = 4th house
- Partner's mother's health = 6th from (10th from 7th) = 6th from 4th = 9th house

**Common Derivative Houses:**
- 2nd from any house = their money/resources
- 3rd from any house = their siblings/communication
- 4th from any house = their home/father
- 5th from any house = their children/romance
- 6th from any house = their illness/employees
- 7th from any house = their partner
- 8th from any house = their death/partner's money
- 10th from any house = their career/mother
- 11th from any house = their friends
- 12th from any house = their hidden enemies

---

## Special Considerations

### When Multiple Houses Apply:

**Example: "Will my romantic partner propose?"**
- 5th = romance (dating phase)
- 7th = marriage, committed partnership
- Use 7th if already in committed relationship
- Use 5th if still dating/courting

**Example: "Will I make money from my hobby?"**
- 5th = hobby, pleasure
- 2nd = money, income
- 2nd from 5th (6th house) = income from hobby

### Natural Significators:

Some planets are natural significators regardless of house:
- **Sun** = men, father, authority, health
- **Moon** = women, mother, body, emotions (always co-significator of querent)
- **Venus** = women, love, beauty, art
- **Mars** = men, conflict, surgery, violence
- **Jupiter** = wealth, fortune, expansion, judges
- **Saturn** = old people, delays, structures, limitations
- **Mercury** = young people, communication, commerce

Use natural significators IN ADDITION to house rulers, not instead of.

---

## Updating This Document

### When to Add New Topics:

1. **User asks question using terminology not clearly covered**
   - Example: "my colleague" - is that 6th (co-worker) or 11th (friend)?
   - Research traditional interpretation
   - Add clarification

2. **LLM misidentifies which house to use**
   - Document the correct house
   - Add example question
   - Add to "Common Mistakes to Avoid"

3. **New modern topics emerge**
   - Social media = 3rd (communication) or 11th (friends/groups)?
   - Cryptocurrency = 2nd (moveable possessions) or 8th (speculation)?
   - Document the reasoning

### Update Process:

```bash
# 1. Edit this file with new information
# 2. Update condensed version in src/utils/llm.ts if needed
# 3. Commit
git add docs/house-meanings-reference.md
git commit -m "docs: add [topic] to [house] meanings

[Brief explanation of why this topic belongs to this house]
"
```

### Balancing Prompt Token Count:

**Full details → This file**
**Condensed version → LLM prompt in src/utils/llm.ts**

Only update the LLM prompt when:
- A topic is asked about frequently
- The LLM consistently misidentifies the house
- The topic is fundamental to horary practice

Otherwise, this reference serves as documentation for YOU when prompt engineering.

---

## References

- William Lilly - "Christian Astrology" (1647)
- John Frawley - "The Real Astrology" (2000)
- Traditional horary astrology sources
- User feedback and edge cases encountered in practice

**Last Updated:** February 22, 2025
