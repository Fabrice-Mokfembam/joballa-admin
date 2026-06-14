export const CAMEROON_REGION_IDS = [
  "adamawa",
  "centre",
  "east",
  "farNorth",
  "littoral",
  "north",
  "northwest",
  "south",
  "southwest",
  "west",
] as const;

export type CameroonRegionId = (typeof CAMEROON_REGION_IDS)[number];

export const CAMEROON_CITIES_BY_REGION: Record<CameroonRegionId, readonly string[]> = {
  adamawa: ["Ngaoundéré", "Meiganga", "Banyo", "Tibati", "Tignère"],
  centre: ["Yaoundé", "Mbalmayo", "Obala", "Nanga-Éboko", "Monatélé", "Akonolinga"],
  east: ["Bertoua", "Abong-Mbang", "Batouri", "Bélabo", "Yokadouma"],
  farNorth: ["Maroua", "Kousseri", "Mokolo", "Mora", "Kaélé", "Yagoua"],
  littoral: ["Douala", "Édéa", "Loum", "Manjo", "Nkongsamba", "Mbanga", "Penja"],
  north: ["Garoua", "Guider", "Figuil", "Poli", "Pitoa", "Rey Bouba"],
  northwest: ["Bamenda", "Wum", "Kumbo", "Ndop", "Nkambe", "Fundong"],
  south: ["Ebolowa", "Mvangan", "Ambam", "Kye-Ossi", "Sangmélima"],
  southwest: ["Buea", "Limbe", "Kumba", "Tiko", "Muyuka", "Mamfe", "Mundemba", "Bangem"],
  west: ["Bafoussam", "Dschang", "Foumban", "Mbouda", "Bangangté", "Baham"],
};

export function getCitiesForRegion(regionId: string): readonly string[] {
  if (regionId in CAMEROON_CITIES_BY_REGION) {
    return CAMEROON_CITIES_BY_REGION[regionId as CameroonRegionId];
  }
  return [];
}

export const DEFAULT_CAMEROON_REGION: CameroonRegionId = "littoral";
