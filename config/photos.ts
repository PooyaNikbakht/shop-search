// Which real photo a product card shows. Products are synthetic, so photos are mapped by
// subcategory and picked deterministically from the product id: the same product always gets the
// same photo, and neighbours in the grid tend to differ. Subcategories with no entry fall back to
// the SVG line drawing. All photos are from Unsplash; see CREDITS.md.

/** Photo key (file public/photos/<key>-<width>.webp) and what it shows, for alt text. */
export const PHOTOS = {
  "p-boot-redrock": "Hiking boots standing on red sandstone",
  "p-boot-ridge": "Worn leather hiking boots on a rock above a mountain valley",
  "p-boot-meadow": "A pair of hiking boots in a meadow below a peak",
  "p-boot-single": "A muddy hiking boot on a lichen-covered rock",
  "p-boot-studio": "Well-worn leather boots on a white background",
  "p-runner-mud": "Muddy trail running shoes on a path",
  "p-runner-cliff": "A trail shoe on a hiker's foot, dangling over a cliff",
  "p-sandal-grass": "Brown strap sandals on green grass",
  "p-sandal-dirt": "Leather sandals on dry, rocky ground",
  "p-winter-snow": "Insulated winter boots on a snowy deck",
  "p-winter-burgundy": "Burgundy lace-up winter boots walking on snow",
  "p-shell-navy": "A hooded navy rain shell seen from behind in an autumn forest",
  "p-shell-blue": "A blue hooded rain shell seen from behind, beaded with rain",
  "p-shell-colorblock": "A navy and orange rain jacket on a hiker in the woods",
  "p-down-orange": "A hiker in an orange down jacket and beanie looking over hills",
  "p-down-yellow": "A mustard puffer jacket hanging by a bookshelf",
  "p-parka-rust": "A rust-coloured insulated parka with the hood up in a snowy forest",
  "p-fleece-brown": "A brown fleece jacket on a man by a river, seen from behind",
  "p-softshell-olive": "An olive softshell jacket with the zip open",
  "p-pants-hiker": "A hiker in tan trekking pants on a rocky trail",
  "p-pants-climb": "A climber in mustard climbing pants with a rack of gear",
  "p-pants-ski": "A skier in red ski pants looking at snowy peaks",
  "p-shorts-ridge": "A hiker in dark trail shorts on a rocky ridge",
  "p-base-folded": "Three folded crew-neck tees: black, sand and blue",
  "p-base-tee": "A sand-coloured crew-neck tee",
  "p-base-longsleeve": "A grey long-sleeve base layer worn outdoors",
  "p-pack-canvas": "A canvas backpack resting in tall grass",
  "p-pack-orange": "An orange and teal backpack on grass by a stream",
  "p-pack-rock": "A red daypack leaning on a rock by the water",
  "p-pack-sunset": "A grey hiking pack and bottle on a rock at sunset",
  "p-pack-tan": "A tan hiking pack with side pockets on a stone wall",
  "p-tent-ridge": "A pale green tent pitched on a ridge at dusk",
  "p-tent-yellow": "A small yellow tent in a mountain meadow",
  "p-tent-lake": "A dome tent on a lakeshore with forest and mountains behind",
  "p-tent-orange": "A grey and orange tent on a grassy plain under storm clouds",
  "p-tent-white": "A white dome tent on green grass",
  "p-bag-blue": "A blue mummy sleeping bag laid out on a grassy summit",
  "p-bag-pair": "Orange and blue sleeping bags on a rocky camp below snowy peaks",
  "p-bag-orange": "An orange sleeping bag on a wooden deck above the clouds",
  "p-beanie-mustard": "A mustard knit beanie",
  "p-headlamp-stars": "A headlamp beam reaching into a starry night sky",
  "p-socks-snow": "Patterned wool socks and approach shoes in the snow",
  "p-bottle-green": "A sage green insulated bottle",
  "p-bottle-lake": "A black insulated bottle on a rock by a lake",
  "p-gloves-poles": "Insulated gloves hung on poles against snowy mountains",
  "p-cap-yellow": "A yellow baseball cap",
  "p-poles-meadow": "Two trekking poles planted in a mountain meadow",
} as const;

export type PhotoKey = keyof typeof PHOTOS;

export const SUBCATEGORY_PHOTOS: Record<string, readonly PhotoKey[]> = {
  "Hiking Boot": ["p-boot-redrock", "p-boot-ridge", "p-boot-meadow", "p-boot-single"],
  "Approach Shoe": ["p-boot-studio", "p-runner-mud", "p-boot-single"],
  "Trail Runner": ["p-runner-mud", "p-runner-cliff"],
  Sandal: ["p-sandal-grass", "p-sandal-dirt"],
  "Winter Boot": ["p-winter-snow", "p-winter-burgundy"],
  "Rain Shell": ["p-shell-navy", "p-shell-blue", "p-shell-colorblock"],
  "Down Jacket": ["p-down-orange", "p-down-yellow"],
  "Insulated Parka": ["p-parka-rust", "p-down-orange"],
  "Fleece Jacket": ["p-fleece-brown"],
  "Softshell Jacket": ["p-softshell-olive", "p-shell-colorblock"],
  "Hiking Pant": ["p-pants-hiker", "p-runner-cliff"],
  "Climbing Pant": ["p-pants-climb"],
  "Rain Pant": ["p-pants-hiker", "p-shell-blue"],
  "Ski Pant": ["p-pants-ski"],
  "Trail Short": ["p-shorts-ridge"],
  "Merino Crew": ["p-base-folded", "p-base-tee"],
  "Synthetic Tee": ["p-base-tee", "p-base-folded"],
  "Sun Hoodie": ["p-base-longsleeve"],
  // "Merino Bottoms" has no matching photo and keeps the line drawing.
  Daypack: ["p-pack-orange", "p-pack-canvas", "p-pack-rock"],
  "Hiking Pack": ["p-pack-tan", "p-pack-sunset"],
  "Hydration Pack": ["p-pack-sunset", "p-pack-rock"],
  "Travel Pack": ["p-pack-canvas", "p-pack-tan"],
  "Ultralight Pack": ["p-pack-rock", "p-pack-orange"],
  "Backpacking Tent": ["p-tent-ridge", "p-tent-yellow"],
  "Car Camping Tent": ["p-tent-lake", "p-tent-orange"],
  "Mountaineering Tent": ["p-tent-ridge", "p-tent-white"],
  "Ultralight Shelter": ["p-tent-white", "p-tent-yellow"],
  "Down Sleeping Bag": ["p-bag-blue", "p-bag-pair"],
  "Synthetic Sleeping Bag": ["p-bag-orange", "p-bag-pair"],
  "Kids Sleeping Bag": ["p-bag-blue"],
  "Camp Quilt": ["p-bag-orange"],
  Beanie: ["p-beanie-mustard"],
  Gaiters: ["p-socks-snow"],
  Headlamp: ["p-headlamp-stars"],
  "Hiking Sock": ["p-socks-snow"],
  "Insulated Bottle": ["p-bottle-green", "p-bottle-lake"],
  "Insulated Glove": ["p-gloves-poles"],
  "Trail Cap": ["p-cap-yellow"],
  "Trekking Poles": ["p-poles-meadow"],
};

/** Category tiles use one photo each: public/photos/t-<category>-<width>.webp (decorative). */

/** FNV-1a: small, stable, and the same in every runtime. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The photo for a product, or null when its subcategory has none. */
export function photoFor(product: { id: string; subcategory: string }): { key: PhotoKey; alt: string } | null {
  const options = SUBCATEGORY_PHOTOS[product.subcategory];
  if (!options?.length) return null;
  const key = options[hash(product.id) % options.length];
  return { key, alt: PHOTOS[key] };
}
