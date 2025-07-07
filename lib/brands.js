const brands = [
  {
    id: 'glossier',
    name: 'Glossier',
    logo: '/brands/glossier.png',
    tagline: 'Soft, dreamy pastels',
    baseDescription: 'Glossier brand aesthetic: soft dreamy pastels, dewy aesthetic, millennial pink, natural lighting, lifestyle photography, youthful energy',
    colorPalette: ['#FF9EC7', '#F7E7CE', '#E1F7F5', '#FFFFFF'],
    styleKeywords: ['soft', 'dreamy', 'pastel', 'dewy', 'youthful']
  },
  {
    id: 'tesla',
    name: 'Tesla',
    logo: '/brands/tesla.png',
    tagline: 'Sleek, futuristic tech',
    baseDescription: 'Tesla brand aesthetic: sleek futuristic tech, clean lines, modern industrial, metallic finishes, sophisticated presentation, innovation focus',
    colorPalette: ['#E31937', '#000000', '#FFFFFF', '#C0C0C0'],
    styleKeywords: ['sleek', 'futuristic', 'tech', 'modern', 'sophisticated']
  },
    {
    id: 'nike',
    name: 'Nike',
    logo: '/brands/nike.png',
    tagline: 'Bold, athletic energy',
    baseDescription: 'Nike brand aesthetic: bold athletic energy, high contrast black and white with vibrant accent colors, swoosh inspiration, dynamic movement, sports performance focus, motivational energy',
    colorPalette: ['#000000', '#FFFFFF', '#FF6B35'],
    styleKeywords: ['dynamic', 'bold', 'energetic', 'performance', 'athletic']
  },
  {
    id: 'apple',
    name: 'Apple',
    logo: '/brands/apple.png',
    tagline: 'Clean, crisp minimalism',
    baseDescription: 'Apple brand aesthetic: clean minimalist design, white backgrounds, premium materials, sleek product photography, sophisticated simplicity, modern luxury',
    colorPalette: ['#FFFFFF', '#F5F5F7', '#1D1D1F', '#0071E3'],
    styleKeywords: ['minimal', 'clean', 'premium', 'sophisticated', 'crisp']
  },
  {
    id: 'aesop',
    name: 'Aesop',
    logo: '/brands/aesop.png',
    tagline: 'Minimalist, warm luxury',
    baseDescription: 'Aesop brand aesthetic: minimalist warm luxury, earth tones, clean typography, apothecary-style presentation, sophisticated simplicity, natural materials',
    colorPalette: ['#F4F1EA', '#8B7355', '#2C2826', '#D4C4A8'],
    styleKeywords: ['minimalist', 'warm', 'luxury', 'natural', 'sophisticated']
  },
  {
    id: 'patagonia',
    name: 'Patagonia',
    logo: '/brands/patagonia.png',
    tagline: 'Rugged, outdoor adventure',
    baseDescription: 'Patagonia brand aesthetic: rugged outdoor adventure, natural lighting, mountain/nature backgrounds, authentic feel, environmental consciousness, durability focus',
    colorPalette: ['#0066CC', '#FF6B35', '#2C5234', '#8B4513'],
    styleKeywords: ['rugged', 'outdoor', 'adventure', 'natural', 'authentic']
  },
    {
    id: 'supreme',
    name: 'Supreme',
    logo: '/brands/supreme.png',
    tagline: 'Bold, direct street culture',
    baseDescription: 'Supreme brand aesthetic: bold direct street culture, red and white branding, urban photography, hype aesthetic, exclusive feel, street credibility',
    colorPalette: ['#FF0000', '#FFFFFF', '#000000'],
    styleKeywords: ['bold', 'direct', 'street', 'culture', 'hype']
  },
  {
    id: 'tiffany',
    name: 'Tiffany & Co.',
    logo: '/brands/tiffany.png',
    tagline: 'Luxury, elegant, timeless, sophisticated',
    baseDescription: 'Tiffany brand aesthetic: luxury, elegant, timeless, sophisticated',
    colorPalette: ['#0ABAB5', '#FFFFFF', '#000000'],
    styleKeywords: ['luxury', 'elegant', 'timeless', 'sophisticated']
  }
];

function getBrandById(id) {
  return brands.find(brand => brand.id === id);
}

module.exports = {
  brands,
  getBrandById
}; 