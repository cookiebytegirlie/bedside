// Central barrel for the Figma-exported image assets (kept in a folder with
// spaces in its name, so importing directly from call sites is awkward).
import danielPhoto from './image assets/Daniel V. Photo.webp'
import elliePhoto from './image assets/Ellie V. Photo.webp'
import priyaPhoto from './image assets/Priya A. Photo.webp'
import marcusPhoto from './image assets/Marcus F. Photo.webp'
import logo from './image assets/Full Square Gradient Logo.webp'

export const profilePhotos = {
  daniel: danielPhoto,
  ellie: elliePhoto,
  priya: priyaPhoto,
  marcus: marcusPhoto,
}

export const householdLogo = logo
