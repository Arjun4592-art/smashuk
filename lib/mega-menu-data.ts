export const MEGA_MENUS = {
  badminton: {
    label: 'Badminton',
    icon: '🏸',
    href: '/shop?sport=badminton',
    columns: [{
      heading: 'Rackets',
      links: [{
        label: 'All Rackets',
        href: '/shop?sport=badminton&category=rackets'
      }, {
        label: 'Yonex',
        href: '/shop?sport=badminton&brand=yonex'
      }, {
        label: 'Victor',
        href: '/shop?sport=badminton&brand=victor'
      }, {
        label: 'Li-Ning',
        href: '/shop?sport=badminton&brand=li-ning'
      }, {
        label: 'Babolat',
        href: '/shop?sport=badminton&brand=babolat'
      }]
    }, {
      heading: 'Shoes',
      links: [{
        label: 'All Shoes',
        href: '/shop?sport=badminton&category=shoes'
      }, {
        label: 'Men',
        href: '/shop?sport=badminton&category=shoes&gender=men'
      }, {
        label: 'Women',
        href: '/shop?sport=badminton&category=shoes&gender=women'
      }, {
        label: 'Yonex',
        href: '/shop?sport=badminton&category=shoes&brand=yonex'
      }, {
        label: 'Victor',
        href: '/shop?sport=badminton&category=shoes&brand=victor'
      }, {
        label: 'Li-Ning',
        href: '/shop?sport=badminton&category=shoes&brand=li-ning'
      }]
    }, {
      heading: 'Others',
      links: [{
        label: 'Racket Bags',
        href: '/shop?sport=badminton&category=bags'
      }, {
        label: 'Shuttlecocks',
        href: '/shop?sport=badminton&category=shuttlecocks'
      }, {
        label: 'Racket Grips',
        href: '/shop?sport=badminton&category=grips'
      }]
    }, {
      heading: 'Popular',
      links: [{
        label: 'Beginner Rackets',
        href: '/shop?sport=badminton&level=beginner'
      }, {
        label: 'Intermediate',
        href: '/shop?sport=badminton&level=intermediate'
      }, {
        label: 'Advanced',
        href: '/shop?sport=badminton&level=advanced'
      }, {
        label: 'Head Heavy',
        href: '/shop?sport=badminton&style=head-heavy'
      }]
    }],
    featured: {
      label: 'New Arrivals',
      description: 'Check out the latest badminton gear we just stocked.',
      href: '/shop?sport=badminton&badge=NEW',
      cta: 'Shop Now'
    },
    featured2: {
      label: 'Badminton Racket Guide',
      description: 'Choosing the right racket for your game.',
      href: '/blog?sport=badminton',
      cta: 'Read Guide'
    }
  },
  tennis: {
    label: 'Tennis',
    icon: '🎾',
    href: '/shop?sport=tennis',
    columns: [{
      heading: 'Rackets',
      links: [{
        label: 'All Rackets',
        href: '/shop?sport=tennis&category=rackets'
      }, {
        label: 'Babolat',
        href: '/shop?sport=tennis&brand=babolat'
      }, {
        label: 'HEAD',
        href: '/shop?sport=tennis&brand=head'
      }, {
        label: 'Yonex',
        href: '/shop?sport=tennis&brand=yonex'
      }, {
        label: 'Junior Rackets',
        href: '/shop?sport=tennis&level=junior'
      }]
    }, {
      heading: 'Shoes',
      links: [{
        label: 'All Shoes',
        href: '/shop?sport=tennis&category=shoes'
      }, {
        label: 'Men',
        href: '/shop?sport=tennis&category=shoes&gender=men'
      }, {
        label: 'Women',
        href: '/shop?sport=tennis&category=shoes&gender=women'
      }, {
        label: 'Babolat',
        href: '/shop?sport=tennis&category=shoes&brand=babolat'
      }, {
        label: 'K-Swiss',
        href: '/shop?sport=tennis&category=shoes&brand=k-swiss'
      }, {
        label: 'Adidas',
        href: '/shop?sport=tennis&category=shoes&brand=adidas'
      }]
    }, {
      heading: 'Other Equipment',
      links: [{
        label: 'Tennis Balls',
        href: '/shop?sport=tennis&category=balls'
      }, {
        label: 'Tennis Bags',
        href: '/shop?sport=tennis&category=bags'
      }, {
        label: 'Racket Grips',
        href: '/shop?sport=tennis&category=grips'
      }]
    }, {
      heading: 'Brand',
      links: [{
        label: 'Babolat Store',
        href: '/shop?brand=babolat'
      }, {
        label: 'Yonex Store',
        href: '/shop?brand=yonex'
      }, {
        label: 'HEAD Store',
        href: '/shop?brand=head'
      }, {
        label: 'Wilson Store',
        href: '/shop?brand=wilson'
      }]
    }],
    featured: {
      label: 'Tennis Clearance',
      description: "Limited stock — all must go. Grab before it's gone!",
      href: '/shop?sport=tennis&badge=SALE',
      cta: 'Shop Sale'
    }
  },
  padel: {
    label: 'Padel',
    icon: '🏓',
    href: '/shop?sport=padel',
    columns: [{
      heading: 'Rackets by Brand',
      links: [{
        label: 'Adidas',
        href: '/shop?sport=padel&brand=adidas'
      }, {
        label: 'Babolat',
        href: '/shop?sport=padel&brand=babolat'
      }, {
        label: 'Bullpadel',
        href: '/shop?sport=padel&brand=bullpadel'
      }, {
        label: 'HEAD',
        href: '/shop?sport=padel&brand=head'
      }, {
        label: 'Tecnifibre',
        href: '/shop?sport=padel&brand=tecnifibre'
      }, {
        label: 'Dunlop',
        href: '/shop?sport=padel&brand=dunlop'
      }]
    }, {
      heading: 'Popular',
      links: [{
        label: 'Sale Rackets',
        href: '/shop?sport=padel&badge=SALE'
      }, {
        label: 'Best Sellers',
        href: '/shop?sport=padel&badge=BESTSELLER'
      }, {
        label: 'New Arrivals',
        href: '/shop?sport=padel&badge=NEW'
      }]
    }, {
      heading: 'Others',
      links: [{
        label: 'Padel Balls',
        href: '/shop?sport=padel&category=balls'
      }, {
        label: 'Padel Shoes',
        href: '/shop?sport=padel&category=shoes'
      }, {
        label: 'Padel Bags',
        href: '/shop?sport=padel&category=bags'
      }]
    }],
    featured: {
      label: 'Padel Guide',
      description: 'How to choose your next padel racket — complete guide.',
      href: '/blog/padel-racket-guide',
      cta: 'Read Guide'
    }
  },
  squash: {
    label: 'Squash',
    icon: '🥎',
    href: '/shop?sport=squash',
    columns: [{
      heading: 'Rackets',
      links: [{
        label: 'All Rackets',
        href: '/shop?sport=squash&category=rackets'
      }, {
        label: 'Dunlop',
        href: '/shop?sport=squash&brand=dunlop'
      }, {
        label: 'HEAD',
        href: '/shop?sport=squash&brand=head'
      }, {
        label: 'Wilson',
        href: '/shop?sport=squash&brand=wilson'
      }]
    }, {
      heading: 'Accessories',
      links: [{
        label: 'Squash Balls',
        href: '/shop?sport=squash&category=balls'
      }, {
        label: 'Squash Bags',
        href: '/shop?sport=squash&category=bags'
      }, {
        label: 'Racket Grips',
        href: '/shop?sport=squash&category=grips'
      }]
    }],
    featured: {
      label: 'Best Sellers',
      description: 'Top-rated squash gear loved by players across the UK.',
      href: '/shop?sport=squash&badge=BESTSELLER',
      cta: 'Shop Now'
    }
  },
  clothing: {
    label: 'Clothing',
    icon: '👕',
    href: '/shop?sport=clothing',
    columns: [{
      heading: 'Men',
      links: [{
        label: "All Men's",
        href: '/shop?sport=clothing&gender=men'
      }, {
        label: 'Tops',
        href: '/shop?sport=clothing&gender=men&style=tops'
      }, {
        label: 'Bottoms',
        href: '/shop?sport=clothing&gender=men&style=bottoms'
      }, {
        label: 'Socks',
        href: '/shop?sport=clothing&style=socks'
      }]
    }, {
      heading: 'Women',
      links: [{
        label: "All Women's",
        href: '/shop?sport=clothing&gender=women'
      }, {
        label: 'Tops',
        href: '/shop?sport=clothing&gender=women&style=tops'
      }, {
        label: 'Bottoms',
        href: '/shop?sport=clothing&gender=women&style=bottoms'
      }, {
        label: 'Socks',
        href: '/shop?sport=clothing&style=socks'
      }]
    }],
    featured: {
      label: 'New Season Kits',
      description: 'Fresh 2025 collection — performance meets style.',
      href: '/shop?sport=clothing&badge=NEW',
      cta: 'Explore'
    }
  },
  localStore: {
    label: 'Local Store',
    icon: '🏬',
    href: '/local-store',
    columns: [{
      heading: 'Store Services',
      links: [{
        label: 'Stringing Services',
        href: 'https://smashuk-manchester.co.uk/CustomerStatus'
      }, {
        label: 'Racket Trial Service',
        href: '/local-store/racket-demo'
      }, {
        label: 'Visit Us',
        href: '/local-store'
      }]
    }, {
      heading: 'Partnership Programme',
      links: [{
        label: 'Club / University Partnerships',
        href: '/local-store/partnerships'
      }, {
        label: 'Club Demo Racket',
        href: '/local-store/club-demo-programme'
      }, {
        label: 'Kit Printing Services',
        href: '/local-store/kit-printing'
      }]
    }],
    featured: {
      label: 'Our Store',
      description: 'Local racket specialists — tailored advice for your game.',
      href: '/local-store',
      cta: 'Visit Store',
      image: '/local-store/menu-store.jpg'
    },
    featured2: {
      label: 'Emergency Restring Service',
      description: 'Need a racket restrung in time for a game? Contact us to arrange an on-the-spot stringing service.',
      href: 'https://smashuk-manchester.co.uk/CustomerStatus',
      cta: 'Book Now',
      image: '/local-store/menu-emergency-restring.jpg'
    }
  }
};
export type MegaMenuKey = keyof typeof MEGA_MENUS;
