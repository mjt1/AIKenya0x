import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { AgentsService } from '../agents/agents.service';
import { Role } from '../common/types/rbac.types';

export interface CreateAdminCommandOptions {
  email?: string;
  password?: string;
  name?: string;
  county?: string;
}

/**
 * Seeds a platform admin out-of-band (admins have no self-signup beyond the
 * first-registrant bootstrap rule). Creates a `:Agent` with `role = admin`
 * directly.
 *
 * Usage:
 *   yarn cli create-admin -e admin@suluhu.io -p s3cret! -n "Suluhu Admin"
 *   yarn cli create-admin admin@suluhu.io s3cret! "Suluhu Admin"
 *   yarn cli create-admin -e a@b.io -p pw -n "A" -y Kakamega
 */
@Command({
  name: 'create-admin',
  aliases: ['ca'],
  arguments: '[email] [password] [name]',
  description: 'Create an Agent with the admin role (programmatic admin seed)',
})
export class CreateAdminCommand extends CommandRunner {
  private readonly logger = new Logger(CreateAdminCommand.name);

  constructor(private readonly agents: AgentsService) {
    super();
  }

  async run(
    passedParams: string[],
    options: CreateAdminCommandOptions = {},
  ): Promise<void> {
    const email = (options.email ?? passedParams[0])?.trim().toLowerCase();
    const password = options.password ?? passedParams[1];
    const name = (options.name ?? passedParams[2] ?? 'Platform Admin').trim();
    const county = options.county?.trim() ?? '';

    if (!email || !password) {
      this.logger.error(
        'Usage: create-admin <email> <password> [name]  (or -e/-p/-n flags)',
      );
      process.exitCode = 1;
      return;
    }
    if (password.length < 8) {
      this.logger.error('Password must be at least 8 characters');
      process.exitCode = 1;
      return;
    }

    const existing = await this.agents.findByEmail(email);
    if (existing) {
      this.logger.error(`An agent with email ${email} already exists`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.agents.create({
      id: uuid(),
      name,
      email,
      passwordHash,
      county,
      role: Role.admin,
    });

    this.logger.log(
      `✓ Admin created: ${created.id} <${created.email}> "${created.name}"`,
    );
  }

  @Option({ flags: '-e, --email <email>', description: 'Admin email' })
  parseEmail(v: string) { return v; }

  @Option({ flags: '-p, --password <password>', description: 'Admin password (min 8 chars)' })
  parsePassword(v: string) { return v; }

  @Option({ flags: '-n, --name <name>', description: 'Display name' })
  parseName(v: string) { return v; }

  @Option({ flags: '-y, --county <county>', description: 'County' })
  parseCounty(v: string) { return v; }
}
