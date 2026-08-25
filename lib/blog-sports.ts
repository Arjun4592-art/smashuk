export type SportConfig = {
  name: string;
  slug: string;
  icon: string;
  tagline: string;
  intro: string;
};
export const SPORTS: SportConfig[] = [{
  name: 'Badminton',
  slug: 'badminton',
  icon: '🏸',
  tagline: 'Racket weight, balance, string tension and technique guides for badminton players of every level.',
  intro: "Everything we've learned stringing thousands of badminton rackets and playing at club and county level — weight, balance, tension, and how to actually pick a racket that suits your game."
}, {
  name: 'Tennis',
  slug: 'tennis',
  icon: '🎾',
  tagline: 'Grip sizing, stringing advice and gear breakdowns to help you find a tennis racket that suits your game.',
  intro: 'Grip size, string tension, racket weight — the details that actually change how a tennis racket feels on court, explained by a team that plays the sport themselves.'
}, {
  name: 'Padel',
  slug: 'padel',
  icon: '🏓',
  tagline: 'Everything padel — from choosing your first bat to the rules, technique and kit tips for the court.',
  intro: 'Padel is still new to a lot of players in the UK. These guides cover the basics — bat shape, core density, weight — so you can pick your first bat with confidence.'
}];
export function getSportBySlug(slug: string): SportConfig | undefined {
  return SPORTS.find(s => s.slug === slug);
}
