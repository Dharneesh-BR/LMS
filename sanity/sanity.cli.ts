import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'kdugdssj',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production'
  },
  studioHost: process.env.SANITY_STUDIO_HOST || 'magnafic-course-studio',
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
