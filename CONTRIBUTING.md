# Contributing to Smart Parking System

Thank you for your interest in contributing to the **Smart Parking System** project! We welcome feedback, bug reports, and pull requests to improve the platform.

---

## Code of Conduct

Please treat all contributors and community members with respect, kindness, and professionalism.

---

## Getting Started

1. **Fork the Repository:** Create your own fork on GitHub.
2. **Clone Locally:**
   ```bash
   git clone https://github.com/<your-username>/Smart-Parking.git
   cd Smart-Parking
   ```
3. **Set Up Environments:**
   - Configure `backend/.env` using `backend/.env.example`.
   - Configure `frontend/.env.local` using `frontend/.env.example`.
4. **Install Dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

---

## Branching Guidelines

- Create a feature branch with a descriptive name:
  - `feature/new-slot-algorithm`
  - `fix/reservation-timer-bug`
  - `docs/update-api-spec`

---

## Commit Guidelines

Follow conventional commit formats:
- `feat:` for new capabilities
- `fix:` for bug fixes
- `docs:` for documentation updates
- `refactor:` for code refactoring without changing behavior
- `chore:` for dependency or build pipeline updates

---

## Pull Request Process

1. Ensure the code compiles and linting passes (`npm run lint` in the `frontend` directory).
2. Avoid committing unnecessary files, test artifacts, or credentials.
3. Open a pull request against the `main` branch with a clear description of the problem solved and test steps taken.
