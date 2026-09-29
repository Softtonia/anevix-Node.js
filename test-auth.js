const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://anevix_ecom:Anevix12345@cluster0.u1tced1.mongodb.net/?appName=Cluster0').then(async () => {
  const RoleHasUser = mongoose.model('RoleHasUser', new mongoose.Schema({},{strict:false}), 'role_has_users');
  const Role = mongoose.model('Role', new mongoose.Schema({},{strict:false}), 'roles');
  const roleMappings = await RoleHasUser.find({ user_id: new mongoose.Types.ObjectId('6ab20b2aa549a153e282894c') });
  const roleIds = roleMappings.map(m => m.role_id);
  const roles = await Role.find({ id: { $in: roleIds } });
  console.log(roles.map(r=>r.slug));
  process.exit(0);
});
