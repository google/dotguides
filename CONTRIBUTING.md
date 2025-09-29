# How to contribute

We'd love to accept your patches and contributions to this project.

## Before you begin

### Sign our Contributor License Agreement

Contributions to this project must be accompanied by a
[Contributor License Agreement](https://cla.developers.google.com/about) (CLA).
You (or your employer) retain the copyright to your contribution; this simply
gives us permission to use and redistribute your contributions as part of the
project.

If you or your current employer have already signed the Google CLA (even if it
was for a different project), you probably don't need to do it again.

Visit <https://cla.developers.google.com/> to see your current agreements or to
sign a new one.

### Review our community guidelines

This project follows
[Google's Open Source Community Guidelines](https://opensource.google/conduct/).

## Contribution process

The easiest way to develop is to use `npm link` to create an always up-to-date binary:

```
npm link
npm run build:watch
```

This will make the `dotguides` command consistently run from your latest code.

- Add unit tests for new functionality (`foo.ts` -> `foo.test.ts`)
- Open an issue to discuss major changes to behavior with maintainers

### Code reviews

All submissions, including submissions by project members, require review. We
use GitHub pull requests for this purpose. Consult
[GitHub Help](https://help.github.com/articles/about-pull-requests/) for more
information on using pull requests.

## Workflow

You will need `npm` installed, which is out of scope for this
document.

After cloning the repo, follow these steps to build and run locally:

```
npm install
npm link
npm run build:watch
```

After you perform the above, `dotguides` in your local path should
run your newly built local copy.

To run tests:

```
npm test
```
