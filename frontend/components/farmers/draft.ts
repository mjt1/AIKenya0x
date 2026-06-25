// Local form-draft types for registering a farmer. Numbers are kept as strings
// while editing and converted on submit.

export interface AnimalDraft {
  breed: string;
  lactationStage: string;
}

export interface FieldDraft {
  areaHa: string;
  variety: string;
  ratoonCycle: string;
}

export interface EnterpriseDraft {
  key: string;
  type: "Dairy" | "Sugarcane";
  animals: AnimalDraft[];
  fields: FieldDraft[];
}

export function newEnterprise(type: "Dairy" | "Sugarcane"): EnterpriseDraft {
  return {
    key: Math.random().toString(36).slice(2),
    type,
    animals: [],
    fields: [],
  };
}

export function emptyAnimal(): AnimalDraft {
  return { breed: "", lactationStage: "" };
}

export function emptyField(): FieldDraft {
  return { areaHa: "", variety: "", ratoonCycle: "" };
}
