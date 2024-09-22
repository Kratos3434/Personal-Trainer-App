const prisma = require('../prismaInstance');
const { decodeToken } = require("./Authorization");

class FitnessUtils {
    /**
     * Method to get consolidated fitness results 
     * @param {Request} req 
     * @param {Response} res
     * @return {Promise}
     */
    static async getFitnessResult(req, res) {
        const { bodyMeasurementId } = req.params;

        try {
            if (!bodyMeasurementId) throw "bodyMeasurmentId is required";

            // Query measurement data from BodyMeasurement table
            const measurement = await prisma.bodyMeasurement.findUnique({
                where: {
                    id: parseInt(bodyMeasurementId)
                }
            });

            if (!measurement) throw "Body measurement does not exist";

            const { bodyFatPercent, muscleMass } = measurement;
            
            if (!bodyFatPercent) throw "Body Fat % is required";
            if (!muscleMass) throw "Lean Muscle Mass is required";

            // Query dob and gender from Profile table
            const decoded = decodeToken(req.headers.authorization);
            const userId = decoded.id;

            const profile = await prisma.profile.findUnique({
                where: {
                    userId: userId
                },
                select: {
                    dob: true,
                    gender: true
                }
            });

            if (!profile) throw "Profile does not exist";

            const { dob, gender } = profile;

            if (!dob) throw "Date of Birth is required";
            if (!gender) throw "Gender is required";

            // Calculate age
            const age = FitnessUtils.getAgeFromDob(dob);           

            // Get classification (Athletes, Fit, Average, etc)
            const classification = FitnessUtils.getClassificationResult(bodyFatPercent, age, gender);

            // Get dynamically fetched body fat chart
            const ranges = FitnessUtils.getClassificationRanges(age, gender);

            // Send all data to the Fitness Result Page for display
            res.status(200).json({ bodyFatPercent, muscleMass, classification, ranges });
        } catch (err) {
            console.error("Error calculating body fat:", err);
            res.status(400).json({ error: err.message });
        }
    };

    /**
     * Method to get age from dateTime string
     * @param {String} dob 
     * @returns {number}
     */
    static getAgeFromDob(dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    /**
     * Method to get body fat %
     * @param {number} age 
     * @param {String} gender 
     * @param {number} chest 
     * @param {number} abdomen 
     * @param {number} thigh 
     * @returns {number}
     */
    static calculateBodyFat(age, gender, chest, abdomen, thigh) {
        const sumOfSkinfolds = chest + abdomen + thigh;
        let bodyDensity;

        // Formula for males
        if (gender === 'M') {
            bodyDensity = 1.10938 - (0.0008267 * sumOfSkinfolds) + (0.0000016 * Math.pow(sumOfSkinfolds, 2)) - (0.0002574 * age);
        }
        // Formula for females
        else {
            bodyDensity = 1.0994921 - (0.0009929 * sumOfSkinfolds) + (0.0000023 * Math.pow(sumOfSkinfolds, 2)) - (0.0001392 * age);
        }

        // Convert to body fat %
        const bodyFatPercent = (495 / bodyDensity) - 450;

        return parseFloat(bodyFatPercent.toFixed(1)); // rounded up to 1 decimal
    }

    /**
     * Method to get lean muscle mass
     * @param {number} weight 
     * @param {number} bodyFatPercent 
     * @returns {number}
     */
    static calculateLeanMuscleMass(weight, bodyFatPercent) {
        const leanMass = weight * (1 - (bodyFatPercent / 100));

        return parseFloat(leanMass.toFixed(1));
    }

    /**
     * Method to get classification tier 
     * @param {number} bodyFat 
     * @param {number} age 
     * @param {String} gender 
     * @returns {String} 'Athletes', 'Fit', 'Average', etc
     */
    static getClassificationResult(bodyFat, age, gender) {
        const ageGroup = FitnessUtils.getAgeGroup(age);
        const chart = FitnessUtils.bodyFatClassification[ageGroup];

        if (age <= 17) {
            return "Result is based on\nthe min age 18";
        }

        for (const range of chart) {
            if (bodyFat >= range[gender].min && bodyFat <= range[gender].max) {
                return range.classification;
            }
        }
        return "Out of classification range";
    };

    /**
     * Method to get body fat chart dynamically based on age and gender for the frontend 
     * @param {number} age 
     * @param {String} gender 
     * @returns {object}
     */
    static getClassificationRanges(age, gender) {
        const ageGroup = FitnessUtils.getAgeGroup(age);
        const chart = FitnessUtils.bodyFatClassification[ageGroup];

        return {
            ageGroup: ageGroup,
            classifications: chart.map(range => ({
                classification: range.classification,
                men: range.M.max === Infinity ? `>${range.M.min}%` : `${range.M.min} - ${range.M.max}%`,
                women: range.F.max === Infinity ? `>${range.F.min}%` : `${range.F.min} - ${range.F.max}%`,
                min: range[gender].min,
                max: range[gender].max
            }))
        }
    };

    /**
     * Map age to age group
     * @param {number} age 
     * @returns {String}
     */
    static getAgeGroup(age) {
        if (age <= 17) return "18-29";
        if (age >= 18 && age <= 29) return "18-29";
        if (age >= 30 && age <= 39) return "30-39";
        if (age >= 40 && age <= 49) return "40-49";
        if (age >= 50 && age <= 59) return "50-59";
        if (age >= 60) return "60+";
    };

    // Body Fat chart based on gender and age group
    static bodyFatClassification = {
        "18-29": [
            { classification: "Essential Fat", M: { min: 2, max: 5 }, F: { min: 10, max: 13 } },
            { classification: "Athletes", M: { min: 5.1, max: 9.3 }, F: { min: 13.1, max: 17 } },
            { classification: "Fit", M: { min: 9.4, max: 14 }, F: { min: 17.1, max: 20.5 } },
            { classification: "Average", M: { min: 14.1, max: 17.5 }, F: { min: 20.6, max: 23.6 } },
            { classification: "Below Average", M: { min: 17.6, max: 22.5 }, F: { min: 23.7, max: 27.6 } },
            { classification: "Poor", M: { min: 22.6, max: Infinity }, F: { min: 27.7, max: Infinity } }
        ],
        "30-39": [
            { classification: "Essential Fat", M: { min: 2, max: 5 }, F: { min: 10, max: 13 } },
            { classification: "Athletes", M: { min: 5.1, max: 13.8 }, F: { min: 13.1, max: 17.9 } },
            { classification: "Fit", M: { min: 13.9, max: 17.4 }, F: { min: 18, max: 21.5 } },
            { classification: "Average", M: { min: 17.5, max: 20.4 }, F: { min: 21.6, max: 24.8 } },
            { classification: "Below Average", M: { min: 20.5, max: 24.1 }, F: { min: 24.9, max: 29.2 } },
            { classification: "Poor", M: { min: 24.2, max: Infinity }, F: { min: 29.3, max: Infinity } }
        ],
        "40-49": [
            { classification: "Essential Fat", M: { min: 2, max: 5 }, F: { min: 10, max: 13 } },
            { classification: "Athletes", M: { min: 5.1, max: 16.2 }, F: { min: 13.1, max: 21.2 } },
            { classification: "Fit", M: { min: 16.3, max: 19.5 }, F: { min: 21.3, max: 24.8 } },
            { classification: "Average", M: { min: 19.6, max: 22.4 }, F: { min: 24.9, max: 28 } },
            { classification: "Below Average", M: { min: 22.5, max: 26 }, F: { min: 28.1, max: 32 } },
            { classification: "Poor", M: { min: 26.1, max: Infinity }, F: { min: 32.1, max: Infinity } }
        ],
        "50-59": [
            { classification: "Essential Fat", M: { min: 2, max: 5 }, F: { min: 10, max: 13 } },
            { classification: "Athletes", M: { min: 5.1, max: 17.8 }, F: { min: 13.1, max: 24.9 } },
            { classification: "Fit", M: { min: 17.9, max: 21.2 }, F: { min: 25, max: 28.4 } },
            { classification: "Average", M: { min: 21.3, max: 24 }, F: { min: 28.5, max: 31.5 } },
            { classification: "Below Average", M: { min: 24.1, max: 27.4 }, F: { min: 31.6, max: 35.5 } },
            { classification: "Poor", M: { min: 27.5, max: Infinity }, F: { min: 35.6, max: Infinity } }
        ],
        "60+": [
            { classification: "Essential Fat", M: { min: 2, max: 5 }, F: { min: 10, max: 13 } },
            { classification: "Athletes", M: { min: 5.1, max: 18.3 }, F: { min: 13.1, max: 25 } },
            { classification: "Fit", M: { min: 18.4, max: 21.9 }, F: { min: 25.1, max: 29.2 } },
            { classification: "Average", M: { min: 22, max: 25 }, F: { min: 29.3, max: 32.4 } },
            { classification: "Below Average", M: { min: 25.1, max: 28.4 }, F: { min: 32.5, max: 36.5 } },
            { classification: "Poor", M: { min: 28.5, max: Infinity }, F: { min: 36.6, max: Infinity } }
        ]
    };
}

module.exports = FitnessUtils;