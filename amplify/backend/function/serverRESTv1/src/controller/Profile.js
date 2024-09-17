const prisma = require('../prismaInstance');

class Profile {
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async saveProfile(req, res) {
        const { dob, gender } = req.body;

        if (!dob) throw "Email is required";
        if (!gender) throw "password is required";

        const privateKey = fs.readFileSync('privateKey.key');

        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        const decoded = jwt.verify(token, privateKey);

        const userId = decoded.id;

        try {
            const updatedProfile = await prisma.profile.update({
                where: {
                    userId: userId,
                },
                data : {
                    dob: new Date(dob),
                    gender,
                    updatedAt: new Date(),
                }
            })

            res.status(200).json({status: true, data: null, message: "Profile Saved"});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }


    }
}

module.exports = Profile;