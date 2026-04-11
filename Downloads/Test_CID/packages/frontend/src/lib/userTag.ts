/** Returns "username#1234" if discriminator is set, otherwise "@username" */
export function userTag(user: { username: string; discriminator?: string | null }): string {
  if (user.discriminator && user.discriminator !== '0000') {
    return `${user.username}#${user.discriminator}`;
  }
  return `@${user.username}`;
}
