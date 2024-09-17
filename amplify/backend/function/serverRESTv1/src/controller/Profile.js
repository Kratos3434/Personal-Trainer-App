const prisma = require('../prismaInstance');
const Authorization = require('./Authorization');

class Profile {
    static async saveProfile(req, res) {
        const { dob, gender } = req.body;

        try {
            const decoded = Authorization.decodeToken(req.headers.authorization);

            const userId = decoded.id;

            const updatedProfile = await prisma.profile.update({
                where: {
                    userId: userId,
                },
                data : {
                    dob: new Date(dob),
                    gender,
                }
            })

            res.status(200).json({status: true, data: null, message: "Profile Saved"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }


    }
}

module.exports = Profile;