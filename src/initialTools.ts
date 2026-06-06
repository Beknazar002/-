import { Tool } from './types';

export const INITIAL_CATALOG_TOOLS: Omit<Tool, 'id'>[] = [
  {
    name: "Перфоратор Bosch GBH 2-28",
    description: "Профессиональный перфоратор сверления с ударом и долбления, 880 Вт.",
    category: "Электроинструменты",
    serialNumber: "BS-9402-A",
    pricePerDay: 800,
    status: "available"
  },
  {
    name: "Бензопила Stihl MS 180",
    description: "Надежная легкая цепная бензопила для ухода за садовым участком.",
    category: "Садовая техника",
    serialNumber: "ST-1829-X",
    pricePerDay: 1200,
    status: "available"
  },
  {
    name: "Угловая шлифмашина Makita 9558HN",
    description: "Болгарка мощным двигателем 840 Вт и отличной термостойкостью.",
    category: "Электроинструменты",
    serialNumber: "MK-4491-B",
    pricePerDay: 500,
    status: "available"
  },
  {
    name: "Бетоносмеситель Вихрь БМ-140",
    description: "Электрическая бетономешалка объемом 140 литров для стройплощадки.",
    category: "Строительное оборудование",
    serialNumber: "VH-2022-C",
    pricePerDay: 1500,
    status: "available"
  },
  {
    name: "Газонокосилка Champion EM4118",
    description: "Электрическая колесная газонокосилка для травы средней плотности.",
    category: "Садовая техника",
    serialNumber: "CP-8840-E",
    pricePerDay: 1000,
    status: "available"
  },
  {
    name: "Сварочный инвертор Ресанта САИ-220",
    description: "Сварочный аппарат для дуговой сварки штучным электродом.",
    category: "Строительное оборудование",
    serialNumber: "RS-5521-G",
    pricePerDay: 900,
    status: "available"
  }
];
