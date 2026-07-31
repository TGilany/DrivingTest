# DrivingTest

DrivingTest is a browser-based practice app for a driving refresher exam. It presents multiple-choice questions from a local driving question bank and tracks progress, timing, and final results.

## Resources

- Question data is sourced from the local JSON file at `src/data/questions.json`.
- Static assets live in the `public/` folder, including any images used by the app.
- The questions and answers are based on:
  - [Driving Refresher Course.pdf](./Driving%20Refresher%20Course.pdf) — local copy of the booklet used as the question source
  - [חוברת שחולקה בקורס רענון נהיגה 2017 של עמל | PDF](https://www.scribd.com/document/765383740/%D7%97%D7%95%D7%91%D7%A8%D7%AA-%D7%A9%D7%97%D7%95%D7%9C%D7%A7%D7%94-%D7%91%D7%A7%D7%95%D7%A8%D7%A1-%D7%A8%D7%A2%D7%A0%D7%95%D7%9F-%D7%A0%D7%94%D7%99%D7%92%D7%94-2017-%D7%A9%D7%9C-%D7%A2%D7%9E%D7%9C)
  - [The complete pool of questions and answers for the computerized driving theory test | Ministry of Transport and Road Safety](https://www.gov.il/en/Departments/DynamicCollectors/theoryexamhe_data?skip=0)
- The app is built with Vite and React, with Tailwind CSS for styling.

## Tech stack

- `vite` for fast development and production build
- `react` and `react-dom` for UI rendering
- `typescript` for type safety
- `@vitejs/plugin-react` for React support in Vite
- `tailwindcss` for utility-first styling
- `vitest` for unit testing

## Deployment

This repository is prepared for GitHub Pages deployment using the `docs/` folder on the `main` branch. The workflow defined in `.github/workflows/gh-pages.yml` builds the site into `docs/` and commits the generated files back to `main`.
