# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

TO DO
-
LLM
- ~~add LLM integration for horary answers~~
-  refine LLm integration
    - ensure prompt includes information about traditional aspects and planets
    - send correct aspect data to LLM
        - all planetary aspects and all lunar aspect are correctly analysed and shared with the LLM
            - ensure retrograde motion is part of aspect calculation!!!
            - context: July 18 at 10:34PM Toronto, Canada
                moon is separating from sextile to jupiter (correctly analysed)
                but moon is applying to square with mercury - and this was incorrectly analysed likely due to the speed of mercury?
                    {aspectKey: 'square', point1Key: 'moon', point2Key: 'mercury', currentOrb: 4.573599999999999, isApplying: false, …}



CHART 
- ~~aspect data correctly saves from Astro api~~
- add lunar phase to aspect calculation
- show RX symbol for RX planets
- optionally show aspect lines
- move angles to ecliptic of chart

USER 
- add user authentication
    - save each horary question and answer to database
    - allow user to save all questions and answers to a profile

CRUD