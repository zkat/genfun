/*
 * Role
 *
 * A Role encapsulates a particular object's 'role' in a method's
 * dispatch. They are added directly to the selector for a method, and thus
 * do not prevent the objects a method was defined on from being garbage
 * collected.
 */
export default function Role (method, position) {
  this.method = method
  this.position = position
}

Role.roleKeyName = typeof Symbol === 'undefined'
  ? '___genfun_roles_array___'
  : Symbol('roles')
