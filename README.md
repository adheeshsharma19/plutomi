# Plutomi

Plutomi is a _multi-tenant_ [applicant tracking system](https://en.wikipedia.org/wiki/Applicant_tracking_system) that streamlines your entire application process with automated workflows at any scale.

![infra](./images/infra.png)

## Motivation

Having worked at a company that needed to recruit thousands of contractors every month, improving our acquisition flow at that scale became a challenge. Many processes had to be done manually because there just wasn't an API available for it. We often hit limits and had to work around them with a myriad of webhooks, queues, and batch jobs to keep things running smoothly. It would have benefited us to have an open platform to contribute to and build upon and this project is [my](https://www.linkedin.com/in/joswayski/) attempt to do just that.
PS you do not need cloudfalre, you can use S3 just fine. I chose to use it because it's much cheaper on egress.
and create a cache rule to cache buckets like


// TODO add CF worker code
// TODO make an issue to replace it with rust
```bash
(http.host contains "assets.plutomi.com/public")
```

ignore TTL and cache for a long time

## Summary


## TODO to build api for Mac -> Ubuntu linux docker build -. -t plutomi/api --platform linux/amd64

### Also building might take a long time, you might want to use --watch instead in dev mode 

TODO - Wrangler CLI

You can create `applications` which people can apply to. An application can be anything from a job, a location for a delivery company, or a program like a summer camp.

In these applications, you can create `stages` which are individual steps that need to be completed by your `applicants`. You can add `questions` and setup automatic move `rules` that determine where applicants go next depending on their `responses` or after a certain time period.

An application for a delivery company might look like this:

**New York City**

Stages:

1. **Questionnaire** - Collect basic information of an applicant. If an applicant does not complete this stage in 30 days, move them to the _Waiting List_.
2. **Waiting List** - An idle pool of applicants
3. **Document Upload** - Collect an applicant's license
4. **Final Review** - Manually review an applicant's license for compliance
5. **Ready to Drive** - Applicants that have completed your application

TODO - cloudflare cname for `assets.plutomi.com` to point to `assets.plutomi.com.s3.us-east-1.amazonaws.com`

## Prerequisites

- [Node 20](https://nodejs.org/en/download)
- [Rust](https://www.rust-lang.org/tools/install)
- [Docker](https://docs.docker.com/get-docker/)
- [AWS CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install) and [SSO](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)

## Infra

Plutomi is adeployed to AWS using [CDK](https://aws.amazon.com/cdk/). A couple of resources are created like a [Fargate](https://aws.amazon.com/fargate/) service which runs the [web app](/packages/web) (NextJS) and [api](/packages/api/) (Rust with Axum) in a private subnet as well as a NAT instance using [fck-nat](https://fck-nat.dev/) for outbound traffic. We use [SES](https://aws.amazon.com/ses/) for sending emails and have an event processing pipeline to handle things like opens, clicks, bounces, and custom app events like `totp.requested` or `invite.sent`. We use [Lambda](https://aws.amazon.com/lambda/) to process events and they are written in Rust with [Cargo Lambda](https://www.cargo-lambda.info/). We use Cloudflare for DNS, CDN, WAF and other goodies - make sure to add a [Cache Rule](https://developers.cloudflare.com/cache/how-to/cache-rules/) to ignore `/api` routes.

For the database, we are using MongoDB and we store everything in one collection. We write small documents and index a `relatedTo` attribute that is shared across all items. For most queries, we can get an item and all of the items it is related to without using `$lookup`. You can check [this video](https://youtu.be/eEENrNKxCdw?t=1190) for a demonstration of this technique.

Logging is handled by [Axiom](https://axiom.co/) but this isn't required. Do note that we disabled CloudWatch logging in production [due to cost reasons](https://github.com/plutomi/plutomi/issues/944).

### Running Locally

The following will start the API and the web app in development mode:

// document no rollback https://www.reddit.com/r/aws/comments/1993rph/problems_with_complex_deployments_and_how_cdkcf/

```bash
$ scripts/run.sh
```

You can also run either individually:

```bash
$ scripts/run.sh --stack <web|api>
```

The script also has hot reloading for both so you can make changes and see them reflected immediately once you change and save a file. Update the `.env` in `packages/<api|web>`for any environment variables needed.

### Deploying

To deploy to AWS, make sure you have [configured SSO](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html) correctly. Update the `AWS_PROFILE` variable in [deploy.sh](deploy.sh) to match the profile names you want to use. Update the subdomain you want to use for sending emails in [configureEmails.ts](./packages/aws/lib/configureEmails.ts).

Change directories into `packages/aws`, install dependencies, and set up the environment-specific `.env` files and modify the values as needed.

```bash
$ cd packages/aws
$ npm install
$ cp .env.example .env.development
$ cp .env.example .env.staging
$ cp .env.example .env.production
```

TODO add a record to point to S3 buckets

> CNAME assets.plutomi.com -> assets.plutomi.com.s3.us-east-1.amazonaws.com

Once that's done, you can go back to the root and deploy using `scripts/deploy.sh <development|staging|production>`.

After running the deploy script, most of your environment will be setup but you'll need to add a few records to your DNS provider. For a custom domain on the load balancer, make sure to [validate your ACM certificate](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html). For SES, your dashboard should look something like this with the records you need to add:

![SES DNS Records](./images/ses-setup.png)

At the end of it you should have (for each environment)

3 DNS records for DKIM

> Key: XXXXXXXXXXXXX Value: XXXXXXXXXXXXX

1 MX Record for custom mail from

> Key: notifications.plutomi.com Value: feedback-smtp.us-east-1.amazonses.com Priority: 10

1 TXT Record for SPF

> Key notifications.plutomi.com "v=spf1 include:amazonses.com ~all"

1 TXT Record for DMARC:
Also, make sure to setup DMARC. This is a TXT record with the name `_dmarc.yourMAILFROMdomain.com` and value `v=DMARC1; p=none; rua=mailto:you@adomainwhereyoucanreceiveemails.com`
See [this link](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html) for more information.

Then after all of that is done, make sure to beg aws to get you out of sandbox since you now have a way to handle complaints.

In MongoDB, make sure to whitelist the IP address of the NAT instance which you can find in the EC2 console. We will eventually migrate over to use [PrivateLink](packages/aws/privateLink.md).

## License

This project is licensed under the [Apache 2.0 license](LICENSE). Here is a [TLDR](https://www.tldrlegal.com/license/apache-license-2-0-apache-2-0).

## Contributing & Contributors

To make a contribution, submit a pull request into the `main` branch. You will be asked to sign a [Contributor License Agreement](https://en.wikipedia.org/wiki/Contributor_License_Agreement) for your PR. You'll only have to do this once.

Thanks goes to these wonderful people who contributed!

# TODO - Replace S3 with R2 now that workers are working

Create a bucket in R2
Add a subdomain to it like `assets.plutomi.com`
Create a worker and `bind` the R2 bucket to it
Add some logic to the worker to auto-reject requests that do not include `assets.plutomi.com/public`

Note: Keep the bucket private, don't add a custom domain to it. Use a worker to fetch the file, or a presigned URL directly from the server.
Have the worker triger on `assets.plutomi.com` or whatever

Make sure to disable routes but keep the custom domain

For cache rule, recommend suffixing the subdomain with -assets.plutomi.com for dev and staging environments so you can have 1 cache rule for all.
In

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/joswayski"><img src="https://avatars.githubusercontent.com/u/22891173?v=4?s=100" width="100px;" alt="Jose Valerio"/><br /><sub><b>Jose Valerio</b></sub></a><br /><a href="https://github.com/plutomi/plutomi/commits?author=joswayski" title="Code">💻</a> <a href="#infra-joswayski" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-joswayski" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/praguru14"><img src="https://avatars.githubusercontent.com/u/48213609?v=4?s=100" width="100px;" alt="praguru14"/><br /><sub><b>praguru14</b></sub></a><br /><a href="https://github.com/plutomi/plutomi/commits?author=praguru14" title="Code">💻</a> <a href="#maintenance-praguru14" title="Maintenance">🚧</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mazupicua"><img src="https://avatars.githubusercontent.com/u/37680756?v=4?s=100" width="100px;" alt="Jose Valerio"/><br /><sub><b>Jose Valerio</b></sub></a><br /><a href="https://github.com/plutomi/plutomi/commits?author=mazupicua" title="Code">💻</a> <a href="#maintenance-mazupicua" title="Maintenance">🚧</a> <a href="https://github.com/plutomi/plutomi/issues?q=author%3Amazupicua" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Jeremyjay121"><img src="https://avatars.githubusercontent.com/u/94778748?v=4?s=100" width="100px;" alt="Jeremy Trenchard"/><br /><sub><b>Jeremy Trenchard</b></sub></a><br /><a href="https://github.com/plutomi/plutomi/commits?author=Jeremyjay121" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CodingRubix"><img src="https://avatars.githubusercontent.com/u/94731024?v=4?s=100" width="100px;" alt="CodingRubix"/><br /><sub><b>CodingRubix</b></sub></a><br /><a href="https://github.com/plutomi/plutomi/commits?author=CodingRubix" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jlittlewood-scottlogic"><img src="https://avatars.githubusercontent.com/u/124571917?v=4?s=100" width="100px;" alt="jlittlewood-scottlogic"/><br /><sub><b>jlittlewood-scottlogic</b></sub></a><br /><a href="https://github.com/plutomi/plutomi/commits?author=jlittlewood-scottlogic" title="Code">💻</a> <a href="#design-jlittlewood-scottlogic" title="Design">🎨</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Questions

Open an issue! Or [DM me on Twitter](https://twitter.com/notjoswayski) or email jose@plutomi.com
