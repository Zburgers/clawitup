# Vulnerable Demo App

This fixture backs the `auth-boundary` eval.

Seeded issues:

- route tenant selection trusts a caller-supplied override,
- invoice amount normalization accepts invalid negative values,
- the test surface does not cover cross-tenant reads.

The eval fixture uses these files as a stable, inspectable demo target rather than as a production app.
