import { FamilyMember, Gender, PrivacySetting } from "../types";
import { encryptData } from "./crypto";

// Seed data generators
export function generateTreeA(userId: string, masterKey: string): FamilyMember[] {
  const enc = (val: string) => encryptData(val, masterKey);
  const now = Date.now();

  const members: FamilyMember[] = [];

  // 1. Self
  members.push({
    id: "a_self",
    userId,
    name: "Alex Vance",
    birthdate: enc("1995-04-12"),
    birthplace: "Boston, MA",
    gender: Gender.MALE,
    relationshipToRoot: "Self",
    parents: ["a_father", "a_mother"],
    siblings: ["a_sibling_fiona", "a_sibling_thomas"],
    children: [],
    contactPhone: enc("+1-617-555-0192"),
    contactEmail: enc("alex.vance@gmail.com"),
    address: enc("120 Beacon St, Boston, MA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Genealogy enthusiast and active keeper of the Vance lineage log.",
    createdAt: now
  });

  // 2. Father
  members.push({
    id: "a_father",
    userId,
    name: "Charles Vance",
    birthdate: enc("1968-11-23"),
    birthplace: "New York, NY",
    gender: Gender.MALE,
    relationshipToRoot: "Father",
    parents: ["a_gfather_pat", "a_gmother_pat"],
    siblings: ["a_uncle_david", "a_aunt_clara"],
    children: ["a_self", "a_sibling_fiona", "a_sibling_thomas"],
    contactPhone: enc("+1-617-555-0143"),
    contactEmail: enc("charles.vance@outlook.com"),
    address: enc("45 Oak Ridge Rd, Newton, MA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Retired mechanical engineer. Loves wooden ship models.",
    createdAt: now
  });

  // 3. Mother
  members.push({
    id: "a_mother",
    userId,
    name: "Beatrice Vance",
    birthdate: enc("1971-05-30"),
    birthplace: "Philadelphia, PA",
    gender: Gender.FEMALE,
    relationshipToRoot: "Mother",
    parents: ["a_gfather_mat", "a_gmother_mat"],
    siblings: [],
    children: ["a_self", "a_sibling_fiona", "a_sibling_thomas"],
    contactPhone: enc("+1-617-555-0155"),
    contactEmail: enc("beatrice.vance@gmail.com"),
    address: enc("45 Oak Ridge Rd, Newton, MA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Pediatrician and amateur watercolor painter.",
    createdAt: now
  });

  // 4. Sibling Fiona (Connecting Person 1!)
  members.push({
    id: "a_sibling_fiona",
    userId,
    name: "Fiona Vance",
    birthdate: enc("1992-08-15"),
    birthplace: "Boston, MA",
    gender: Gender.FEMALE,
    relationshipToRoot: "Sibling",
    parents: ["a_father", "a_mother"],
    siblings: ["a_self", "a_sibling_thomas"],
    children: [],
    contactPhone: enc("+1-617-555-0211"),
    contactEmail: enc("fiona.vance@alum.mit.edu"),
    address: enc("89 River Dr, Cambridge, MA"),
    privacy: PrivacySetting.PUBLIC, // Public to allow initial discoverability scan
    isAncestor: false,
    photos: [],
    notes: "Postdoc researcher in bioinformatics. Married to B's brother, bridging the families.",
    createdAt: now
  });

  // 5. Sibling Thomas
  members.push({
    id: "a_sibling_thomas",
    userId,
    name: "Thomas Vance",
    birthdate: enc("1998-02-05"),
    birthplace: "Boston, MA",
    gender: Gender.MALE,
    relationshipToRoot: "Sibling",
    parents: ["a_father", "a_mother"],
    siblings: ["a_self", "a_sibling_fiona"],
    children: [],
    contactPhone: enc("+1-617-555-0299"),
    contactEmail: enc("thomas.v@vance.net"),
    address: enc("Cambridge, MA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Software developer and classical pianist.",
    createdAt: now
  });

  // 6. Paternal Grandfather
  members.push({
    id: "a_gfather_pat",
    userId,
    name: "Richard Vance",
    birthdate: enc("1939-01-14"),
    birthplace: "Brooklyn, NY",
    gender: Gender.MALE,
    relationshipToRoot: "Grandfather",
    parents: ["a_ggfather_arthur", "a_ggmother_sarah"],
    siblings: [],
    children: ["a_father", "a_uncle_david", "a_aunt_clara"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc("Florida, USA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Served in the Navy. Avid gardener and history buff.",
    createdAt: now
  });

  // 7. Paternal Grandmother
  members.push({
    id: "a_gmother_pat",
    userId,
    name: "Alice Vance",
    birthdate: enc("1942-07-22"),
    birthplace: "Boston, MA",
    gender: Gender.FEMALE,
    relationshipToRoot: "Grandmother",
    parents: [],
    siblings: [],
    children: ["a_father", "a_uncle_david", "a_aunt_clara"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc("Florida, USA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Retired primary school teacher.",
    createdAt: now
  });

  // 8. Maternal Grandfather
  members.push({
    id: "a_gfather_mat",
    userId,
    name: "William Vance",
    birthdate: enc("1940-03-10"),
    birthplace: "Philadelphia, PA",
    gender: Gender.MALE,
    relationshipToRoot: "Maternal Grandfather",
    parents: [],
    siblings: [],
    children: ["a_mother"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Architect who designed civic buildings across Pennsylvania.",
    createdAt: now
  });

  // 9. Maternal Grandmother
  members.push({
    id: "a_gmother_mat",
    userId,
    name: "Evelyn Vance",
    birthdate: enc("1944-09-02"),
    birthplace: "Baltimore, MD",
    gender: Gender.FEMALE,
    relationshipToRoot: "Maternal Grandmother",
    parents: [],
    siblings: [],
    children: ["a_mother"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Librarian and passionate journal writer.",
    createdAt: now
  });

  // 10. Uncle David
  members.push({
    id: "a_uncle_david",
    userId,
    name: "David Vance",
    birthdate: enc("1970-02-18"),
    birthplace: "New York, NY",
    gender: Gender.MALE,
    relationshipToRoot: "Uncle",
    parents: ["a_gfather_pat", "a_gmother_pat"],
    siblings: ["a_father", "a_aunt_clara"],
    children: ["a_cousin_grace", "a_cousin_henry"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc("Seattle, WA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Environmental consultant on Pacific Northwest projects.",
    createdAt: now
  });

  // 11. Aunt Clara
  members.push({
    id: "a_aunt_clara",
    userId,
    name: "Clara Vance",
    birthdate: enc("1974-10-09"),
    birthplace: "New York, NY",
    gender: Gender.FEMALE,
    relationshipToRoot: "Aunt",
    parents: ["a_gfather_pat", "a_gmother_pat"],
    siblings: ["a_father", "a_uncle_david"],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc("New York, NY"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Curator at the Brooklyn Museum.",
    createdAt: now
  });

  // 12. Cousin Grace
  members.push({
    id: "a_cousin_grace",
    userId,
    name: "Grace Vance",
    birthdate: enc("1999-12-11"),
    birthplace: "Seattle, WA",
    gender: Gender.FEMALE,
    relationshipToRoot: "Cousin",
    parents: ["a_uncle_david"],
    siblings: ["a_cousin_henry"],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Graphic designer and photographer.",
    createdAt: now
  });

  // 13. Cousin Henry
  members.push({
    id: "a_cousin_henry",
    userId,
    name: "Henry Vance",
    birthdate: enc("2002-04-03"),
    birthplace: "Seattle, WA",
    gender: Gender.MALE,
    relationshipToRoot: "Cousin",
    parents: ["a_uncle_david"],
    siblings: ["a_cousin_grace"],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "College soccer player and chemistry student.",
    createdAt: now
  });

  // 14. Great-Grandfather Arthur Vance (Connecting Person 2!)
  members.push({
    id: "a_ggfather_arthur",
    userId,
    name: "Arthur Vance",
    birthdate: enc("1911-03-12"),
    birthplace: "London, UK",
    gender: Gender.MALE,
    relationshipToRoot: "Great-Grandfather",
    parents: ["a_gggfather_george", "a_gggmother_mary"],
    siblings: ["a_gguncle_robert", "a_ggaunt_sarah"],
    children: ["a_gfather_pat"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PUBLIC, // Public to allow initial discoverability scan
    isAncestor: true,
    photos: [],
    notes: "The foundational ancestor. Migrated in 1935. Hand-drawn logs trace back to old London records.",
    createdAt: now
  });

  // 15. Great-Grandmother Sarah
  members.push({
    id: "a_ggmother_sarah",
    userId,
    name: "Sarah Vance",
    birthdate: enc("1915-08-19"),
    birthplace: "Boston, MA",
    gender: Gender.FEMALE,
    relationshipToRoot: "Great-Grandmother",
    parents: [],
    siblings: [],
    children: ["a_gfather_pat"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Avid weaver and volunteer at the Boston Red Cross.",
    createdAt: now
  });

  // 16. Great-Uncle Robert
  members.push({
    id: "a_gguncle_robert",
    userId,
    name: "Robert Vance",
    birthdate: enc("1914-06-05"),
    birthplace: "London, UK",
    gender: Gender.MALE,
    relationshipToRoot: "Great-Uncle",
    parents: ["a_gggfather_george", "a_gggmother_mary"],
    siblings: ["a_ggfather_arthur", "a_ggaunt_sarah"],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Officer in WWII, stationed in Europe.",
    createdAt: now
  });

  // 17. Great-Aunt Sarah
  members.push({
    id: "a_ggaunt_sarah",
    userId,
    name: "Sarah Vance Jr.",
    birthdate: enc("1918-11-11"),
    birthplace: "London, UK",
    gender: Gender.FEMALE,
    relationshipToRoot: "Great-Aunt",
    parents: ["a_gggfather_george", "a_gggmother_mary"],
    siblings: ["a_ggfather_arthur", "a_gguncle_robert"],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Violinist who played with the Boston Symphony Orchestra.",
    createdAt: now
  });

  // 18. Great-Great-Grandfather George
  members.push({
    id: "a_gggfather_george",
    userId,
    name: "George Vance",
    birthdate: enc("1880-05-15"),
    birthplace: "London, UK",
    gender: Gender.MALE,
    relationshipToRoot: "Great-Great-Grandfather",
    parents: [],
    siblings: [],
    children: ["a_ggfather_arthur", "a_gguncle_robert", "a_ggaunt_sarah"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Blacksmith in industrial London. Excellent metallic work documented.",
    createdAt: now
  });

  // 19. Great-Great-Grandmother Mary
  members.push({
    id: "a_gggmother_mary",
    userId,
    name: "Mary Vance",
    birthdate: enc("1884-09-28"),
    birthplace: "Bristol, UK",
    gender: Gender.FEMALE,
    relationshipToRoot: "Great-Great-Grandmother",
    parents: [],
    siblings: [],
    children: ["a_ggfather_arthur", "a_gguncle_robert", "a_ggaunt_sarah"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Schoolmistress and records compiler.",
    createdAt: now
  });

  // 20. Distant Uncle James
  members.push({
    id: "a_distant_james",
    userId,
    name: "James Vance",
    birthdate: enc("1945-12-25"),
    birthplace: "Bristol, UK",
    gender: Gender.MALE,
    relationshipToRoot: "Distant Uncle",
    parents: [],
    siblings: [],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Vance regional archivist based out of Somerset.",
    createdAt: now
  });

  return members;
}

export function generateTreeB(userId: string, masterKey: string): FamilyMember[] {
  const enc = (val: string) => encryptData(val, masterKey);
  const now = Date.now();

  const members: FamilyMember[] = [];

  // User B is "Marcus Vance" (cousin / relative of A)
  // Has 35 members total to represent a rich tree.
  members.push({
    id: "b_self",
    userId,
    name: "Marcus Vance",
    birthdate: enc("1989-10-21"),
    birthplace: "Chicago, IL",
    gender: Gender.MALE,
    relationshipToRoot: "Self",
    parents: ["b_father", "b_mother"],
    siblings: ["b_sibling_arthur", "b_sibling_charlotte"],
    children: ["b_child_luke", "b_child_emma"],
    contactPhone: enc("+1-312-555-0782"),
    contactEmail: enc("marcus.vance@vanceorg.com"),
    address: enc("780 N Michigan Ave, Chicago, IL"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Owner of Tree B. Seeks to verify overlap with the Boston branch.",
    createdAt: now
  });

  // 2. Father
  members.push({
    id: "b_father",
    userId,
    name: "Donald Vance",
    birthdate: enc("1958-04-14"),
    birthplace: "London, UK",
    gender: Gender.MALE,
    relationshipToRoot: "Father",
    parents: ["b_gfather_richard", "b_gmother_alice"],
    siblings: ["b_uncle_peter", "b_aunt_dorothy"],
    children: ["b_self", "b_sibling_arthur", "b_sibling_charlotte"],
    contactPhone: enc("+1-312-555-0144"),
    contactEmail: enc("donald.vance@vanceorg.com"),
    address: enc("Chicago, IL"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Investment manager and passionate ancestral ledger researcher.",
    createdAt: now
  });

  // 3. Mother
  members.push({
    id: "b_mother",
    userId,
    name: "Margaret Vance",
    birthdate: enc("1962-08-30"),
    birthplace: "Detroit, MI",
    gender: Gender.FEMALE,
    relationshipToRoot: "Mother",
    parents: [],
    siblings: [],
    children: ["b_self", "b_sibling_arthur", "b_sibling_charlotte"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc("Chicago, IL"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Pediatric nurse practitioner.",
    createdAt: now
  });

  // 4. Sibling Arthur (Connecting Person 2!)
  members.push({
    id: "b_sibling_arthur",
    userId,
    name: "Arthur Vance Jr.",
    birthdate: enc("1991-03-12"), // Same birthday as Great-Grandfather Arthur Vance
    birthplace: "Chicago, IL",
    gender: Gender.MALE,
    relationshipToRoot: "Sibling",
    parents: ["b_father", "b_mother"],
    siblings: ["b_self", "b_sibling_charlotte"],
    children: [],
    contactPhone: enc("+1-312-555-0911"),
    contactEmail: enc("arthur.vance.jr@gmail.com"),
    address: enc("Boston, MA"),
    privacy: PrivacySetting.PUBLIC, // Discoverable bridge!
    isAncestor: false,
    photos: [],
    notes: "Husband of Fiona Vance (from Tree A). His direct overlap bridges both trees.",
    createdAt: now
  });

  // 5. Sibling Charlotte
  members.push({
    id: "b_sibling_charlotte",
    userId,
    name: "Charlotte Vance",
    birthdate: enc("1994-11-02"),
    birthplace: "Chicago, IL",
    gender: Gender.FEMALE,
    relationshipToRoot: "Sibling",
    parents: ["b_father", "b_mother"],
    siblings: ["b_self", "b_sibling_arthur"],
    children: [],
    contactPhone: enc("+1-312-555-0453"),
    contactEmail: enc("charlotte.v@gmail.com"),
    address: enc("Los Angeles, CA"),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Documentary producer working on family history series.",
    createdAt: now
  });

  // Children of Marcus
  members.push({
    id: "b_child_luke",
    userId,
    name: "Luke Vance",
    birthdate: enc("2016-02-15"),
    birthplace: "Chicago, IL",
    gender: Gender.MALE,
    relationshipToRoot: "Child",
    parents: ["b_self"],
    siblings: ["b_child_emma"],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Energetic preschooler who loves puzzles.",
    createdAt: now
  });

  members.push({
    id: "b_child_emma",
    userId,
    name: "Emma Vance",
    birthdate: enc("2018-07-29"),
    birthplace: "Chicago, IL",
    gender: Gender.FEMALE,
    relationshipToRoot: "Child",
    parents: ["b_self"],
    siblings: ["b_child_luke"],
    children: [],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: false,
    photos: [],
    notes: "Primary school student, eager painter.",
    createdAt: now
  });

  // Paternal Grandfather Richard (matches richard vance!)
  members.push({
    id: "b_gfather_richard",
    userId,
    name: "Richard Vance",
    birthdate: enc("1939-01-14"), // MATCH with Richard in Tree A
    birthplace: "Brooklyn, NY",
    gender: Gender.MALE,
    relationshipToRoot: "Grandfather",
    parents: ["b_ggfather_arthur"],
    siblings: [],
    children: ["b_father", "b_uncle_peter", "b_aunt_dorothy"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PUBLIC, // Public bridge!
    isAncestor: true,
    photos: [],
    notes: "Senior family mentor. Shares the same records with Boston relatives.",
    createdAt: now
  });

  // Paternal Grandmother Alice
  members.push({
    id: "b_gmother_alice",
    userId,
    name: "Alice Vance",
    birthdate: enc("1942-07-22"),
    birthplace: "Boston, MA",
    gender: Gender.FEMALE,
    relationshipToRoot: "Grandmother",
    parents: [],
    siblings: [],
    children: ["b_father", "b_uncle_peter", "b_aunt_dorothy"],
    contactPhone: enc(""),
    contactEmail: enc(""),
    address: enc(""),
    privacy: PrivacySetting.PRIVATE,
    isAncestor: true,
    photos: [],
    notes: "Beloved matriarch of the Chicago Vance line.",
    createdAt: now
  });

  // Let's populate 26 other ancestors and relatives to reach 35 members total!
  const additionalNames = [
    { name: "Peter Vance", gender: Gender.MALE, rel: "Uncle", bdate: "1960-05-18", bplace: "London, UK" },
    { name: "Dorothy Vance", gender: Gender.FEMALE, rel: "Aunt", bdate: "1964-09-02", bplace: "London, UK" },
    { name: "Jeffrey Vance", gender: Gender.MALE, rel: "Cousin", bdate: "1988-02-12", bplace: "Chicago, IL" },
    { name: "Rachel Vance", gender: Gender.FEMALE, rel: "Cousin", bdate: "1991-07-15", bplace: "Chicago, IL" },
    { name: "Samuel Vance", gender: Gender.MALE, rel: "Cousin", bdate: "1995-11-20", bplace: "Detroit, MI" },
    { name: "Katherine Vance", gender: Gender.FEMALE, rel: "Cousin", bdate: "1993-01-08", bplace: "Detroit, MI" },
    { name: "Arthur Vance Sr.", gender: Gender.MALE, rel: "Great-Grandfather", bdate: "1911-03-12", bplace: "London, UK" }, // Match Arthur Vance
    { name: "Joseph Vance", gender: Gender.MALE, rel: "Great-Uncle", bdate: "1913-05-10", bplace: "London, UK" },
    { name: "Elizabeth Vance", gender: Gender.FEMALE, rel: "Great-Aunt", bdate: "1916-12-04", bplace: "London, UK" },
    { name: "George Vance II", gender: Gender.MALE, rel: "Great-Great-Grandfather", bdate: "1880-05-15", bplace: "London, UK" },
    { name: "Martha Vance", gender: Gender.FEMALE, rel: "Great-Great-Grandmother", bdate: "1883-04-18", bplace: "York, UK" },
    { name: "Henry Vance I", gender: Gender.MALE, rel: "3rd Great-Grandfather", bdate: "1855-08-30", bplace: "York, UK" },
    { name: "Agnes Vance", gender: Gender.FEMALE, rel: "3rd Great-Grandmother", bdate: "1859-02-11", bplace: "Leeds, UK" },
    { name: "Thomas Vance I", gender: Gender.MALE, rel: "4th Great-Grandfather", bdate: "1831-04-20", bplace: "Leeds, UK" },
    { name: "Hannah Vance", gender: Gender.FEMALE, rel: "4th Great-Grandmother", bdate: "1835-06-13", bplace: "Somerset, UK" },
    { name: "Charles Vance I", gender: Gender.MALE, rel: "5th Great-Grandfather", bdate: "1802-10-15", bplace: "Somerset, UK" },
    { name: "Jane Vance", gender: Gender.FEMALE, rel: "5th Great-Grandmother", bdate: "1805-03-24", bplace: "Bristol, UK" },
    { name: "Robert Vance I", gender: Gender.MALE, rel: "6th Great-Grandfather", bdate: "1774-12-01", bplace: "Bristol, UK" },
    { name: "Eleanor Vance", gender: Gender.FEMALE, rel: "6th Great-Grandmother", bdate: "1779-05-14", bplace: "Gloucester, UK" },
    { name: "Edward Vance", gender: Gender.MALE, rel: "7th Great-Grandfather", bdate: "1745-02-18", bplace: "Gloucester, UK" },
    { name: "Ann Vance", gender: Gender.FEMALE, rel: "7th Great-Grandmother", bdate: "1749-07-29", bplace: "Bath, UK" },
    { name: "William Vance I", gender: Gender.MALE, rel: "8th Great-Grandfather", bdate: "1712-09-02", bplace: "Bath, UK" },
    { name: "Mary Vance I", gender: Gender.FEMALE, rel: "8th Great-Grandmother", bdate: "1718-11-12", bplace: "Wiltshire, UK" },
    { name: "John Vance I", gender: Gender.MALE, rel: "9th Great-Grandfather", bdate: "1680-03-10", bplace: "Wiltshire, UK" },
    { name: "Sarah Vance I", gender: Gender.FEMALE, rel: "9th Great-Grandmother", bdate: "1685-05-22", bplace: "Dorset, UK" },
    { name: "Richard Vance I", gender: Gender.MALE, rel: "10th Great-Grandfather", bdate: "1651-07-14", bplace: "Dorset, UK" }
  ];

  additionalNames.forEach((item, index) => {
    members.push({
      id: `b_extra_${index}`,
      userId,
      name: item.name,
      birthdate: enc(item.bdate),
      birthplace: item.bplace,
      gender: item.gender,
      relationshipToRoot: item.rel,
      parents: [],
      siblings: [],
      children: [],
      contactPhone: enc(""),
      contactEmail: enc(""),
      address: enc(""),
      privacy: PrivacySetting.PRIVATE,
      isAncestor: true,
      photos: [],
      notes: `Archival record from old regional records. Verified birth year ${item.bdate.split("-")[0]}.`,
      createdAt: now
    });
  });

  return members;
}
