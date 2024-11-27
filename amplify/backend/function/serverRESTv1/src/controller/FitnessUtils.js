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

            const { bodyFatPercent, muscleMass, weight, date } = measurement;
            
            if (!bodyFatPercent) throw "Body Fat % is required";
            if (!muscleMass) throw "Lean Body Mass is required";
            if (!weight) throw "Weight is required";

            // Query dob and gender from Profile table
            const decoded = decodeToken(req.headers.authorization);
            const userId = decoded.id;

            const profile = await prisma.profile.findUnique({
                where: {
                    userId: userId
                },
                select: {
                    dob: true,
                    gender: true,
                    height: true
                }
            });

            if (!profile) throw "Profile does not exist";

            const { dob, gender, height } = profile;

            if (!dob) throw "Date of Birth is required";
            if (!gender) throw "Gender is required";

            // Calculate age
            const age = FitnessUtils.getAgeFromDob(dob);           

            // Get classification (Athletes, Fit, Average, etc)
            const classification = FitnessUtils.getClassificationResult(bodyFatPercent, age, gender);

            // Get FFMI
            const ffmi = FitnessUtils.getFFMI(height, weight, bodyFatPercent);

            // Get FFMI classification
            const ffmiClassification = FitnessUtils.getFFMIClassification(ffmi, gender);

            // Get dynamically fetched body fat chart
            const ranges = FitnessUtils.getClassificationRanges(age, gender);

            // Send all data to the Fitness Result Page for display
            res.status(200).json({ bodyFatPercent, muscleMass, classification, ffmiClassification, ranges, date, weight, age, ffmiTable: FitnessUtils.ffmiScoreTable[gender] });
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
     * Method to get lean body mass
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

    static getFFMI(height, weight, bodyFatPercent) {
        const leanBodyMass = FitnessUtils.calculateLeanMuscleMass(weight, bodyFatPercent);
        const ffmi = leanBodyMass / Math.pow(height / 100, 2);
        
        // Adjusted FFMI
        const adjustedFFMI = ffmi + (6.3 * (1.8 - height / 100));

        return parseFloat(adjustedFFMI.toFixed(1));
    };

    static getFFMIClassification(ffmi, gender) {
        const ffmiTable = this.ffmiScoreTable[gender];

        for (const row of ffmiTable) {
            if (ffmi >= row.ffmi.min && ffmi <= row.ffmi.max) {
                return row.classification;
            }
        }
        return "Unusual/Extreme Result";
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
            { classification: "Essential Fat", M: { min: 2, max: 8 }, F: { min: 10, max: 14 } },
            { classification: "Athletes", M: { min: 8.1, max: 10.5 }, F: { min: 13.1, max: 16.5 } },
            { classification: "Fit", M: { min: 10.6, max: 14.8 }, F: { min: 16.6, max: 19.4 } },
            { classification: "Average", M: { min: 14.9, max: 18.6 }, F: { min: 19.5, max: 22.7 } },
            { classification: "Below Average", M: { min: 18.7, max: 23.1 }, F: { min: 22.8, max: 27.1 } },
            { classification: "Poor", M: { min: 23.2, max: Infinity }, F: { min: 27.2, max: Infinity } }
        ],
        "30-39": [
            { classification: "Essential Fat", M: { min: 2, max: 8 }, F: { min: 10, max: 14 } },
            { classification: "Athletes", M: { min: 8.1, max: 14.5 }, F: { min: 14.1, max: 17.4 } },
            { classification: "Fit", M: { min: 14.6, max: 18.2 }, F: { min: 17.5, max: 20.8 } },
            { classification: "Average", M: { min: 18.3, max: 21.3 }, F: { min: 20.9, max: 24.6 } },
            { classification: "Below Average", M: { min: 21.4, max: 24.9 }, F: { min: 24.7, max: 29.1 } },
            { classification: "Poor", M: { min: 25, max: Infinity }, F: { min: 29.2, max: Infinity } }
        ],
        "40-49": [
            { classification: "Essential Fat", M: { min: 2, max: 8 }, F: { min: 10, max: 14 } },
            { classification: "Athletes", M: { min: 8.1, max: 17.4 }, F: { min: 14.1, max: 19.8 } },
            { classification: "Fit", M: { min: 17.5, max: 20.6 }, F: { min: 19.9, max: 23.8 } },
            { classification: "Average", M: { min: 20.7, max: 23.4 }, F: { min: 23.9, max: 27.6 } },
            { classification: "Below Average", M: { min: 23.5, max: 26.6 }, F: { min: 27.7, max: 31.9 } },
            { classification: "Poor", M: { min: 26.7, max: Infinity }, F: { min: 32, max: Infinity } }
        ],
        "50-59": [
            { classification: "Essential Fat", M: { min: 2, max: 8 }, F: { min: 10, max: 14 } },
            { classification: "Athletes", M: { min: 8.1, max: 19.1 }, F: { min: 14.1, max: 22.5 } },
            { classification: "Fit", M: { min: 19.2, max: 22.1 }, F: { min: 22.6, max: 27 } },
            { classification: "Average", M: { min: 22.2, max: 24.6 }, F: { min: 27.1, max: 30.4 } },
            { classification: "Below Average", M: { min: 24.7, max: 27.8 }, F: { min: 30.5, max: 34.5 } },
            { classification: "Poor", M: { min: 27.9, max: Infinity }, F: { min: 34.6, max: Infinity } }
        ],
        "60+": [
            { classification: "Essential Fat", M: { min: 2, max: 8 }, F: { min: 10, max: 14 } },
            { classification: "Athletes", M: { min: 8.1, max: 19.7 }, F: { min: 14.1, max: 23.2 } },
            { classification: "Fit", M: { min: 19.8, max: 22.6 }, F: { min: 23.3, max: 27.9 } },
            { classification: "Average", M: { min: 22.7, max: 25.2 }, F: { min: 28, max: 31.3 } },
            { classification: "Below Average", M: { min: 25.3, max: 28.4 }, F: { min: 31.4, max: 35.4 } },
            { classification: "Poor", M: { min: 28.5, max: Infinity }, F: { min: 35.5, max: Infinity } }
        ]
    };

    // FFMI classification table
    static ffmiScoreTable = {
        "M": [
            { classification: "Skinny", ffmi: { min: 14, max: 18 }},
            { classification: "Average", ffmi: { min: 18.1, max: 20 }},
            { classification: "Intermediate Built", ffmi: { min: 20.1, max: 22 }},
            { classification: "Advanced Built", ffmi: { min: 22.1, max: 24 }},
            { classification: "Extremely Muscular", ffmi: { min: 24.1, max: 25 }}
        ],
        "F": [
            { classification: "Skinny", ffmi: { min: 10, max: 14 }},
            { classification: "Average", ffmi: { min: 14.1, max: 16 }},
            { classification: "Intermediate Built", ffmi: { min: 16.1, max: 18 }},
            { classification: "Advanced Built", ffmi: { min: 18.1, max: 20 }},
            { classification: "Extremely Muscular", ffmi: { min: 20.1, max: 22 }}
        ]
    };    
}

module.exports = FitnessUtils;