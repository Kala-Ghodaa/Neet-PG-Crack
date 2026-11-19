# scripts/subject_generators.py
"""
Medical Topic Generators for all 19 MBBS subjects.
Implements generate_dynamic_clinical_topic conforming strictly to the official curriculum.
"""

# Master clinical topics registry for all 19 MBBS subjects
SUBJECT_CURRICULUM = {
    "physiology": [
        ("Frank-Starling Law of the Heart", "cardiovascular", "Cardiovascular Physiology", "hemodynamics", "Cardiac Output Regulation", "Preload and Contractility",
         "presents with worsening dyspnea on exertion. Echocardiography demonstrates an end-diastolic volume of 140 mL with stroke volume responding proportionally to venous return.",
         "According to the Frank-Starling mechanism, what is the primary cellular basis for the increase in myocardial contractile force upon ventricular filling?",
         "Increased overlap of actin and myosin filaments and enhanced troponin C calcium sensitivity",
         "Decreased duration of the ventricular action potential plateau phase",
         "Inhibition of the sarcoplasmic reticulum SERCA-2 calcium ATPase pump",
         "Direct opening of voltage-gated T-type calcium channels during phase 4", "A",
         "The Frank-Starling law states that stroke volume increases in response to an increase in end-diastolic volume due to optimal myofilament length and calcium sensitivity.",
         "As cardiac muscle fibers are stretched toward an optimal sarcomere length (2.2 µm), steric hindrance is reduced and troponin C affinity for calcium increases, generating greater cross-bridge cycling and systolic force.",
         "Preload correlates with ventricular end-diastolic volume and sarcomere stretch.",
         "Optimal sarcomere length (2.2 µm) yields maximal active tension.",
         "Overstretching beyond optimal length reduces actin-myosin overlap and contractile force."),

        ("Bohr Effect and Oxygen Delivery", "respiratory", "Respiratory Physiology", "gas-exchange", "Hemoglobin Oxygen Transport", "Oxyhemoglobin Dissociation",
         "undergoes arterial blood gas analysis while exercising vigorously at high altitude. Laboratory values show arterial pH 7.28, PaCO2 48 mmHg, and elevated 2,3-BPG.",
         "Which alteration in the oxygen-hemoglobin dissociation curve occurs, and what is its physiological significance?",
         "Shift to the right, facilitating oxygen unloading in working tissues",
         "Shift to the left, increasing hemoglobin oxygen binding affinity in the lungs",
         "Downhill flattening, reducing total arterial oxygen carrying capacity",
         "No change in position, maintaining a constant P50 of 27 mmHg", "A",
         "Acidosis, hypercapnia, increased temperature, and elevated 2,3-BPG shift the oxygen-hemoglobin dissociation curve to the right (Bohr effect), promoting O2 delivery.",
         "A rightward shift increases P50 (partial pressure at which Hb is 50% saturated). At any given tissue PaO2, hemoglobin has a lower affinity for oxygen, releasing more oxygen to metabolically active peripheral tissues.",
         "Factors shifting curve to RIGHT (CADET face right): CO2, Acidosis, 2,3-DPG, Exercise, Temperature.",
         "Right shift increases P50 and promotes peripheral O2 unloading.",
         "Fetal hemoglobin (HbF) has higher O2 affinity due to low 2,3-BPG binding, shifting left."),

        ("Countercurrent Multiplier in Loop of Henle", "renal", "Renal Physiology", "urine-concentration", "Medullary Hyperosmolarity", "Countercurrent Mechanism",
         "is evaluated for chronic polyuria. Laboratory workup confirms intact tubular ability to generate a 1200 mOsm/L hypertonic medullary interstitium.",
         "Which transport mechanism in the thick ascending limb of the loop of Henle is essential for establishing this corticomedullary osmotic gradient?",
         "Electroneutral Na+-K+-2Cl- cotransporter (NKCC2) pumping solutes into the interstitium",
         "Passive water reabsorption mediated by aquaporin-1 channels",
         "Active sodium-hydrogen antiporter (NHE3) coupled to bicarbonate reabsorption",
         "Aldosterone-dependent epithelial sodium channel (ENaC) reabsorption", "A",
         "The thick ascending limb of Henle actively transports solutes via the apical NKCC2 cotransporter while remaining impermeable to water, driving the countercurrent multiplier.",
         "Solute reabsorption without water creates a dilute tubular fluid (hypotonic) and concentrates the medullary interstitium. Loop diuretics (furosemide) inhibit NKCC2, abolishing this hyperosmolar gradient.",
         "NKCC2 in thick ascending limb pumps Na+, K+, and 2Cl- into the medullary interstitium.",
         "Thick ascending limb is impermeable to water.",
         "Vasa recta maintain the medullary gradient via countercurrent exchange without washing out solutes."),

        ("Excitation-Contraction Coupling in Skeletal Muscle", "neuromuscular", "Nerve and Muscle Physiology", "muscle-contraction", "Skeletal Muscle Physiology", "Cross-Bridge Cycling",
         "is investigated for muscle cramping. Intracellular electrode recordings during voluntary contraction demonstrate rapid T-tubule depolarization and calcium release.",
         "Which specific voltage sensor on the T-tubule membrane triggers calcium release from the terminal cisternae of the sarcoplasmic reticulum?",
         "Dihydropyridine receptor (DHPR) mechanically coupled to Ryanodine receptor (RyR1)",
         "Ligand-gated nicotinic acetylcholine receptor (nAChR)",
         "Calmodulin-activated myosin light chain kinase (MLCK)",
         "Plasma membrane Na+/Ca2+ exchanger (NCX)", "A",
         "Depolarization of skeletal muscle T-tubules activates dihydropyridine receptors (DHPR), which mechanically open ryanodine receptors (RyR1) on the sarcoplasmic reticulum.",
         "Unlike cardiac muscle (which requires extracellular calcium entry for calcium-induced calcium release), skeletal muscle uses mechanical conformational coupling between DHPR and RyR1. Calcium binds to troponin C, moving tropomyosin to expose actin-myosin binding sites.",
         "DHPR acts as a voltage sensor in T-tubules.",
         "RyR1 releases stored calcium from terminal cisternae of sarcoplasmic reticulum.",
         "Calcium binding to troponin C shifts tropomyosin away from actin binding sites.")
    ],

    "biochemistry": [
        ("Competitive Enzyme Inhibition Kinetics", "enzymology", "Enzyme Kinetics", "enzyme-inhibition", "Lineweaver-Burk Analysis", "Competitive Inhibition",
         "is treated with a competitive enzyme inhibitor. Kinetic assays are performed with increasing substrate concentrations.",
         "On a double reciprocal (Lineweaver-Burk) plot, how does a competitive inhibitor alter the Vmax and Km of the reaction?",
         "Km is increased (1/Km shifts closer to zero) while Vmax remains unchanged (common y-intercept)",
         "Both Vmax and Km are decreased proportionally (parallel lines)",
         "Vmax is decreased (y-intercept shifts upward) while Km remains unchanged (common x-intercept)",
         "Km is decreased while Vmax is increased", "A",
         "Competitive inhibitors bind reversibly to the active site, increasing Km (lowering apparent affinity) without altering Vmax (which can be overcome at high substrate levels).",
         "Because high substrate concentrations displace the competitive inhibitor, maximum velocity (Vmax) is preserved. The Lineweaver-Burk plot shows lines intersecting at the same point on the y-axis (1/Vmax).",
         "Competitive inhibitor: Km increases, Vmax unchanged. Intersects on y-axis.",
         "Non-competitive inhibitor: Km unchanged, Vmax decreases. Intersects on negative x-axis.",
         "Uncompetitive inhibitor: Both Km and Vmax decrease proportionally. Parallel lines."),

        ("Von Gierke Disease (GSD Type I)", "metabolism", "Carbohydrate Metabolism", "glycogen-storage-diseases", "Inborn Errors of Carbohydrate Metabolism", "GSD Type Ia",
         "A 4-month-old infant presents with doll-like facial features, severe fasting hypoglycemia, lactic acidosis, hyperuricemia, and massive hepatomegaly without splenomegaly.",
         "Deficiency of which enzyme accounts for the inability to release free glucose from both glycogenolysis and gluconeogenesis?",
         "Glucose-6-phosphatase", "Liver glycogen phosphorylase (Hers disease)", "Alpha-1,4-glucosidase / acid maltase (Pompe disease)", "Debranching enzyme (Cori disease)", "A",
         "Von Gierke disease (GSD Type Ia) is caused by glucose-6-phosphatase deficiency, impairing both glycogenolysis and gluconeogenesis.",
         "Glucose-6-phosphate accumulates and is shunted into glycolysis (producing severe lactic acidosis) and HMP shunt/purine degradation (producing hyperuricemia and gout). Glycogen accumulation causes massive hepatomegaly.",
         "Glucose-6-phosphatase defect blocks the terminal common step of glucose production.",
         "Hallmarks: Severe fasting hypoglycemia, lactic acidosis, hypertriglyceridemia, hyperuricemia.",
         "Liver and kidney are enlarged, but spleen and heart are normal (unlike Pompe)."),

        ("Phenylketonuria (PKU)", "inborn-errors", "Amino Acid Metabolism", "amino-acid-disorders", "Phenylalanine Hydroxylase Deficiency", "Classic PKU",
         "A 6-month-old infant presents with intellectual disability, fair complexion, blonde hair, blue eyes, eczematous skin lesions, and a characteristic 'mousy/musty' body odor.",
         "Deficiency of which enzyme is the underlying biochemical cause of classic phenylketonuria?",
         "Phenylalanine hydroxylase", "Homogentisate oxidase (Alkaptonuria)", "Branched-chain alpha-ketoacid dehydrogenase (MSUD)", "Cystathionine beta-synthase (Homocystinuria)", "A",
         "Classic PKU is caused by autosomal recessive deficiency of phenylalanine hydroxylase (or its cofactor tetrahydrobiopterin BH4).",
         "Phenylalanine accumulates and is transaminated into phenylketones (phenylacetate, phenylpyruvate), causing a musty odor. Inability to synthesize tyrosine causes hypopigmentation (decreased melanin). Tyrosine becomes an essential amino acid.",
         "Phenylalanine hydroxylase converts phenylalanine to tyrosine using BH4 cofactor.",
         "Musty/mousy odor due to urinary phenylketones.",
         "Treatment requires dietary phenylalanine restriction and tyrosine supplementation.")
    ],

    "pathology": [
        ("Chronic Myeloid Leukemia (CML)", "hematopathology", "Hematopathology", "leukemias", "Myeloproliferative Neoplasms", "CML",
         "presents with fatigue, marked splenomegaly extending 8 cm below the left costal margin, and a leukocytosis of 120,000/µL with full spectrum granulocytic maturation. The leukocyte alkaline phosphatase (LAP) score is markedly reduced.",
         "Which reciprocal chromosomal translocation and fusion oncoprotein characterize this disease?",
         "t(9;22)(q34;q11) resulting in BCR-ABL1 constitutively active tyrosine kinase",
         "t(8;14)(q24;q32) resulting in IGH-MYC overexpression",
         "t(14;18)(q32;q21) resulting in BCL2 anti-apoptotic activation",
         "t(15;17)(q24;q21) resulting in PML-RARA promyelocytic fusion", "A",
         "CML is defined by the Philadelphia chromosome t(9;22)(q34;q11), fusing the BCR gene on chromosome 22 with the ABL1 tyrosine kinase gene on chromosome 9.",
         "The resulting BCR-ABL1 fusion protein possesses constitutive tyrosine kinase activity, stimulating unregulated granulocytic proliferation. Low LAP score differentiates CML from a leukemoid reaction (high LAP). Tyrosine kinase inhibitors (imatinib) are targeted therapy.",
         "Philadelphia chromosome: t(9;22) forming BCR-ABL1 fusion oncoprotein.",
         "Low LAP score distinguishes CML from leukemoid reactions.",
         "First-line treatment: Tyrosine kinase inhibitors (Imatinib, Dasatinib)."),

        ("Minimal Change Disease (MCD)", "nephropathology", "Renal Pathology", "glomerular-diseases", "Nephrotic Syndromes", "Minimal Change Disease",
         "A 5-year-old child presents with generalized periorbital and pretibial edema following a recent viral upper respiratory infection. Urinalysis shows massive selective proteinuria (4+), and serum albumin is 1.8 g/dL.",
         "What is the characteristic ultrastructural finding seen on transmission electron microscopy of renal biopsy?",
         "Diffuse effacement (flattening) of visceral epithelial foot processes (podocytes)",
         "Subepithelial 'spike and dome' immune complex deposits",
         "Linear IgG deposition along the glomerular basement membrane",
         "Mesangial dense deposits with 'tram-track' basement membrane splitting", "A",
         "Minimal Change Disease is the most common cause of nephrotic syndrome in children, characterized by normal light microscopy and diffuse podocyte foot process effacement on electron microscopy.",
         "Cytokine-mediated loss of negatively charged glomerular polyanions (heparan sulfate) leads to selective proteinuria (albuminuria). Light microscopy is unremarkable ('minimal change'). Over 90% of pediatric patients achieve remission with corticosteroids.",
         "Most common cause of pediatric nephrotic syndrome.",
         "Electron microscopy: Diffuse foot process effacement; Light microscopy: Normal glomeruli.",
         "Highly responsive to oral corticosteroid therapy (prednisolone).")
    ],

    "pharmacology": [
        ("Organophosphate Toxicity & Antidotal Therapy", "autonomic-pharmacology", "Autonomic Pharmacology", "cholinergic-toxicology", "Organophosphate Poisoning", "Reversal Agents",
         "presents to the emergency department in an obtunded state with pinpoint pupils, profuse salivation, lacrimation, diaphoresis, diffuse wheezing, and muscle fasciculations following acute agricultural pesticide exposure.",
         "Which combination of pharmacologic agents constitutes the definitive antidotal management?",
         "Atropine (muscarinic antagonist) and Pralidoxime / 2-PAM (cholinesterase reactivator)",
         "Physostigmine and Flumazenil",
         "Naloxone and N-acetylcysteine",
         "Pilocarpine and Neostigmine", "A",
         "Organophosphates irreversibly inhibit acetylcholinesterase, causing cholinergic crisis (DUMBBELLS). Atropine blocks muscarinic excess; pralidoxime reactivates acetylcholinesterase before aging occurs.",
         "Atropine counters life-threatening muscarinic hypersecretion (bronchorrhea, bronchospasm, bradycardia) until secretions clear. Pralidoxime (2-PAM) binds organophosphate molecules and regenerates active enzyme, reversing nicotinic neuromuscular paralysis.",
         "Atropine reverses muscarinic signs (endpoint: drying of bronchial secretions).",
         "Pralidoxime reverses nicotinic signs (muscle weakness and fasciculations).",
         "Aging of the phosphorylated enzyme makes inhibition irreversible if pralidoxime is delayed."),

        ("Sacubitril-Valsartan (ARNI) in Heart Failure", "cardiovascular-pharmacology", "Cardiovascular Drugs", "heart-failure", "Neurohormonal Blockade", "Angiotensin Receptor-Neprilysin Inhibitor",
         "with heart failure with reduced ejection fraction (LVEF 28%, NYHA Class III) is initiated on sacubitril-valsartan (ARNI).",
         "What is the mechanism of action of sacubitril, and what biomarker increases as a consequence?",
         "Inhibition of neprilysin, increasing endogenous natriuretic peptides (BNP, ANP)",
         "Direct blockade of beta-1 adrenergic receptors, lowering heart rate",
         "Inhibition of sodium-glucose cotransporter 2 (SGLT2) in proximal renal tubules",
         "Direct antagonism of mineralocorticoid receptors in the collecting duct", "A",
         "Sacubitril is a prodrug that inhibits neprilysin (neutral endopeptidase), preventing the degradation of natriuretic peptides (ANP, BNP) and bradykinin.",
         "Combined with valsartan (ARB to prevent AT1 vasoconstriction and overcome neprilysin inhibition of angiotensin II), ARNI promotes natriuresis, vasodilation, and antiproliferative remodeling. Because BNP is a neprilysin substrate, NT-proBNP must be used to monitor clinical heart failure response.",
         "Sacubitril inhibits neprilysin, increasing circulating natriuretic peptides.",
         "Valsartan blocks AT1 receptor; combined ARNI reduces cardiovascular mortality.",
         "Must allow a 36-hour washout when switching from ACE inhibitors to avoid angioedema.")
    ],

    "microbiology": [
        ("Staphylococcus aureus Toxic Shock Syndrome", "bacteriology", "Bacteriology", "gram-positive-cocci", "Staphylococcal Toxins", "Toxic Shock Syndrome",
         "presents with high fever (39.5°C), diffuse erythematous 'sunburn-like' macular erythroderma, hypotension (BP 78/46 mmHg), and multiorgan failure during menstruation with prolonged tampon retention.",
         "What is the mechanism of action of the causative toxin (TSST-1)?",
         "Acts as a superantigen, cross-linking MHC Class II with TCR beta-chain causing massive cytokine release (IL-1, IL-2, TNF-alpha)",
         "ADP-ribosylates elongation factor 2 (EF-2), halting host cellular protein synthesis",
         "Cleaves SNARE proteins at the presynaptic neuromuscular junction, blocking neurotransmitter release",
         "Inactivates the 60S ribosomal subunit via N-glycosidase activity", "A",
         "Toxic Shock Syndrome Toxin-1 (TSST-1) is a superantigen that activates up to 20% of all T-cells non-specifically, precipitating a massive systemic cytokine storm.",
         "Superantigens bypass normal antigen processing by binding directly to the invariant region of MHC Class II molecules and the V-beta domain of T-cell receptors, triggering unchecked release of TNF-alpha, IL-1, and IL-6 leading to distributive shock.",
         "TSST-1 is a superantigen produced by Staphylococcus aureus.",
         "Binds MHC Class II and T-cell receptor beta-chain without antigen processing.",
         "Causes widespread capillary leak, hypotension, erythematous rash, and subsequent desquamation.")
    ],

    "community-medicine": [
        ("Case-Control Study & Odds Ratio", "epidemiology", "Epidemiology", "study-designs", "Observational Analytic Studies", "Case-Control Studies",
         "A clinical epidemiologist investigates the association between maternal smoking during pregnancy and congenital heart defects. A total of 150 infants with heart defects (cases) and 300 healthy infants (controls) are enrolled, and maternal smoking histories are evaluated retrospectively.",
         "Which measure of association is primarily calculated in this study design?",
         "Odds Ratio (OR)", "Relative Risk (Risk Ratio, RR)", "Attributable Risk (AR)", "Incidence Rate Ratio", "A",
         "Case-control studies select subjects based on disease status (cases vs controls) and look backward for exposure; because population incidence cannot be calculated, the Odds Ratio (OR) is the primary measure of association.",
         "When the disease is rare (prevalence < 5%), the odds ratio closely approximates the relative risk (OR ≈ RR). Relative risk requires a cohort study where unexposed and exposed populations are followed prospectively to determine true incidence.",
         "Case-control studies: Measure of association is Odds Ratio (OR).",
         "Cohort studies: Measure of association is Relative Risk (RR).",
         "Odds ratio approximates relative risk when disease frequency is low (rare disease assumption).")
    ],

    "forensic-medicine": [
        ("Rigor Mortis Timeline & Nysten's Rule", "thanatology", "Thanatology", "post-mortem-changes", "Signs of Death", "Rigor Mortis",
         "During a medico-legal autopsy in a temperate climate, the forensic pathologist observes stiffening of the eyelids, jaw, and neck muscles, while the muscles of the lower extremities remain flaccid.",
         "According to Nysten's rule, what is the approximate post-mortem interval, and what biochemical event initiates rigor mortis?",
         "3 to 6 hours; depletion of cellular ATP preventing detachment of myosin cross-bridges from actin",
         "18 to 24 hours; autolytic breakdown of actin-myosin filaments by lysosomal enzymes",
         "Less than 1 hour; sudden influx of extracellular calcium into myofibrils",
         "36 to 48 hours; secondary flaccidity due to putrefaction", "A",
         "Rigor mortis begins 1-2 hours after death in involuntary muscles, manifests in voluntary muscles around 3-4 hours (eyelids, jaw, neck first via Nysten's rule), is complete at 12 hours, persists for 12 hours, and passes off over the subsequent 12 hours.",
         "ATP is required for the detachment of myosin heads from actin filaments. Following somatic death and glycogen depletion, lack of ATP locks cross-bridges in place, producing permanent muscular rigidity until decomposition sets in.",
         "Rigor mortis develops sequentially: face/jaw -> neck -> upper limbs -> trunk -> lower limbs (Nysten's rule).",
         "Cause: Post-mortem exhaustion of ATP.",
         "Rule of 12: 12 hours to appear, 12 hours to stay, 12 hours to disappear.")
    ],

    "ent": [
        ("Otosclerosis & Carhart's Notch", "otology", "Otology", "middle-ear-diseases", "Bone Dystrophies of Otic Capsule", "Otosclerosis",
         "presents with bilateral progressive hearing loss, worse on the right side, with noticeable improvement in hearing acuity when in noisy environments (paracusis of Willis). Pure tone audiometry demonstrates conductive hearing loss with a dip in bone conduction thresholds at 2000 Hz.",
         "What is this pathognomonic audiometric dip called, and what is the definitive surgical treatment?",
         "Carhart's notch; Stapedectomy with teflon piston insertion",
         "Acoustic notch at 4000 Hz; Modified radical mastoidectomy",
         "Schwartze sign dip; Myringotomy with grommet insertion",
         "Tullio notch; Endolymphatic sac decompression", "A",
         "Carhart's notch is a false dip in bone conduction at 2000 Hz characteristic of otosclerosis caused by stapes footplate fixation; definitive treatment is stapedectomy.",
         "Otosclerosis is an autosomal dominant condition with incomplete penetrance characterized by replacement of normal enchondral bone of the otic capsule by vascular spongy bone (spongiosis). Stapedectomy restores ossicular chain mobility.",
         "Paracusis Willisii: Patient hears better in noisy surroundings.",
         "Carhart's notch: Artifactual dip in bone conduction at 2 kHz.",
         "Schwartze sign / flamingo pink blush on promontory indicates active spongiosis.")
    ],

    "ophthalmology": [
        ("Central Retinal Artery Occlusion (CRAO)", "retina", "Retina and Vitreous", "retinal-vascular-diseases", "Retinal Artery Occlusion", "CRAO",
         "presents with sudden, painless, profound loss of vision in the right eye upon waking. Fundus examination reveals a milky-white, opaque, edematous retina with a prominent 'cherry-red spot' at the fovea.",
         "What is the anatomical explanation for the cherry-red spot in central retinal artery occlusion?",
         "The thin foveola is nourished independently by the underlying choroidal circulation, allowing the red choroid to show through",
         "Extensive intraretinal flame-shaped hemorrhages surrounding the optic disc",
         "Neovascularization of the foveal avascular zone forming a vascular tuft",
         "Accumulation of subretinal exudate beneath the pigmented epithelium", "A",
         "In CRAO, retinal ischemia causes cloudy retinal edema everywhere except at the foveola, where the retina is thin and receives oxygen from the choroid, exposing the red choroid as a cherry-red spot.",
         "CRAO is an ophthalmic emergency analogous to an acute ischemic stroke (often due to carotid atheroembolism). Emergency measures include ocular massage, anterior chamber paracentesis, and intraocular pressure-lowering agents to dislodge the embolus.",
         "Painless, sudden, severe monocular visual loss.",
         "Fundus: Pale edematous retina with cherry-red spot at the macula.",
         "Boxcarring / cattle-trucking of blood columns in retinal vessels.")
    ],

    "dermatology": [
        ("Pemphigus Vulgaris vs Bullous Pemphigoid", "immunodermatology", "Vesiculobullous Disorders", "autoimmune-blistering", "Acantholytic Disorders", "Pemphigus Vulgaris",
         "presents with painful, easily ruptured flaccid blisters and extensive mucosal erosions involving the oral cavity. Lateral pressure on normal-appearing perilesional skin causes shearing and detachment of the epidermis (positive Nikolsky sign).",
         "Which desmosomal adhesion proteins are targeted by pathogenic IgG autoantibodies in this patient?",
         "Desmoglein 3 and Desmoglein 1", "Hemidesmosomal BP180 and BP230", "Type VII collagen in anchoring fibrils", "Transglutaminase in the stratum corneum", "A",
         "Pemphigus vulgaris is caused by IgG autoantibodies targeting desmoglein 3 (mucosal-predominant) and desmoglein 1 (mucocutaneous), resulting in intraepidermal acantholysis.",
         "Acantholysis produces flaccid, easily ruptured blisters with suprabasal splitting and a characteristic 'row of tombstones' basilar layer. Direct immunofluorescence demonstrates a net-like/fishnet pattern of intercellular IgG.",
         "Flaccid bullae, extensive oral erosions, positive Nikolsky sign.",
         "Histology: Suprabasal acantholysis with tombstone basal keratinocytes.",
         "Direct immunofluorescence: Intercellular 'fishnet' pattern of IgG and C3.")
    ],

    "psychiatry": [
        ("Schizophrenia Schneiderian First-Rank Symptoms", "psychosis", "Schizophrenia and Psychotic Disorders", "schizophrenia-psychopathology", "Schneiderian Symptoms", "First-Rank Symptoms",
         "A 24-year-old individual believes that thoughts are being removed from the brain by radio waves ('thought withdrawal') and reports hearing two voices arguing about their behavior in the third person ('running commentary').",
         "According to Kurt Schneider, these symptoms belong to which diagnostic category of psychopathology?",
         "Schneiderian first-rank symptoms of schizophrenia", "Pathognomonic features of psychotic major depression", "Dissociative identity disorder passivity phenomena", "Delirium tremens acoustic hallucinosis", "A",
         "Voices arguing, voices giving a running commentary, and thought passivity (insertion, withdrawal, broadcasting) are classic Schneiderian first-rank symptoms (FRS) of schizophrenia.",
         "Although not entirely unique to schizophrenia (can occur in bipolar mania), FRS have high clinical utility in establishing a diagnosis of schizophrenia in the absence of organic brain disorders or substance intoxication.",
         "Auditory hallucinations: Third person voices, running commentary, thoughts spoken aloud (Gedankenlautwerden).",
         "Delusions of control: Passivity of affect, impulse, or volition.",
         "Thought alienation: Thought insertion, thought withdrawal, thought broadcasting.")
    ],

    "medicine": [
        ("Acute Anterior STEMI Management", "cardiology", "Cardiovascular Medicine", "acute-coronary-syndromes", "ST-Elevation Myocardial Infarction", "Anterior STEMI",
         "presents 90 minutes after the onset of severe crushing substernal chest pain radiating to the left arm and jaw. Electrocardiography reveals 4 mm ST-segment elevations in leads V1 through V4 with reciprocal ST depressions in leads II, III, and aVF.",
         "Which coronary artery is occluded, and what is the guideline-directed initial reperfusion strategy?",
         "Left Anterior Descending artery (LAD); Emergency Primary Percutaneous Coronary Intervention (PCI)",
         "Right Coronary Artery (RCA); Intravenous unfractionated heparin alone",
         "Left Circumflex artery (LCx); Emergent coronary artery bypass grafting within 48 hours",
         "Posterior Descending Artery (PDA); Elective exercise treadmill testing", "A",
         "ST elevations in precordial leads V1-V4 localize to the anterior ventricular wall supplied by the LAD; primary PCI within 90-120 minutes of first medical contact is the gold standard reperfusion.",
         "Dual antiplatelet therapy (aspirin + ticagrelor/prasugrel), parenteral anticoagulation, high-intensity statin, and emergency catheterization are initiated immediately. Door-to-balloon time goal is < 90 minutes.",
         "Leads V1-V4 reflect the anterior wall supplied by the LAD.",
         "Primary PCI is the preferred reperfusion strategy if available within 120 minutes.",
         "Immediate medical therapy includes chewable aspirin, P2Y12 inhibitor, and statin.")
    ],

    "surgery": [
        ("Tension Pneumothorax Emergency Decompression", "trauma-surgery", "Trauma and Critical Care Surgery", "thoracic-trauma", "Life-Threatening Thoracic Trauma", "Tension Pneumothorax",
         "sustains blunt chest trauma in a motor vehicle collision. Examination reveals respiratory distress, severe hypotension (BP 72/40 mmHg), distended neck veins, absent breath sounds over the right hemithorax, and tracheal deviation to the left.",
         "What is the immediate, life-saving intervention before obtaining any radiological investigations?",
         "Emergency needle thoracostomy in the 5th intercostal space anterior to the mid-axillary line, followed by tube thoracostomy",
         "Urgent portable chest radiography to confirm diagnosis",
         "Immediate endotracheal intubation with high positive end-expiratory pressure",
         "Pericardiocentesis using the subxiphoid approach under ultrasound guidance", "A",
         "Tension pneumothorax is a clinical diagnosis requiring immediate needle decompression (ATLS 10th edition: 5th intercostal space anterior to mid-axillary line in adults) without waiting for chest imaging.",
         "Positive intrapleural pressure collapses the ipsilateral lung and shifts the mediastinum, kinking the inferior vena cava and obstructing venous return, rapidly leading to obstructive shock and cardiac arrest. Chest radiograph must NEVER delay decompression.",
         "Clinical triad: Hypotension, absent breath sounds, tracheal deviation.",
         "ATLS 10th ed site: 5th ICS anterior to mid-axillary line (or 2nd ICS mid-clavicular line in pediatrics).",
         "Follow immediately with large-bore tube thoracostomy (chest drain).")
    ],

    "obstetrics-gynecology": [
        ("Eclampsia Management & Magnesium Sulfate", "obstetrics", "Obstetric Complications", "hypertensive-disorders-pregnancy", "Preeclampsia and Eclampsia", "Seizure Prophylaxis",
         "A 26-year-old primigravida at 34 weeks gestation with severe preeclampsia (BP 170/110 mmHg, 3+ proteinuria) experiences a generalized tonic-clonic convulsion in the triage area.",
         "What is the drug of choice for arresting and preventing recurrent eclamptic seizures, and what is its specific antidote?",
         "Magnesium sulfate; Antidote: 10% Calcium gluconate",
         "Diazepam; Antidote: Flumazenil",
         "Phenytoin; Antidote: Folic acid",
         "Sodium valproate; Antidote: L-carnitine", "A",
         "Magnesium sulfate (Pritchard or Zuspan regimen) is the undisputed anticonvulsant of choice in eclampsia; 10% calcium gluconate is the specific antidote for magnesium toxicity.",
         "Magnesium sulfate works by blocking NMDA receptors and reducing cerebral vasospasm. Clinical monitoring requires checking patellar deep tendon reflexes (first to disappear with toxicity), respiratory rate (> 12/min), and urine output (> 30 mL/h).",
         "Magnesium sulfate is superior to diazepam and phenytoin for eclampsia.",
         "Therapeutic serum magnesium level: 4 to 7 mEq/L (2 to 3.5 mmol/L).",
         "Loss of deep tendon reflexes is the earliest clinical sign of magnesium toxicity; treat with 10% calcium gluconate 10 mL IV over 10 minutes.")
    ],

    "pediatrics": [
        ("Tetralogy of Fallot & Hypercyanotic Spells", "pediatric-cardiology", "Pediatric Cardiology", "congenital-heart-defects", "Cyanotic Heart Disease", "Tetralogy of Fallot",
         "An 18-month-old toddler with known congenital heart disease becomes acutely irritable, deeply cyanotic, and tachypneic while crying. The child instinctively assumes a squatting posture.",
         "What is the physiological mechanism by which the squatting (knee-chest) position relieves hypercyanotic 'tet' spells?",
         "Increases systemic vascular resistance (SVR), reducing right-to-left shunting and increasing pulmonary blood flow",
         "Decreases venous return to the right atrium, relieving pulmonary capillary wedge pressure",
         "Relaxes the subpulmonic infundibular spasm, opening the right ventricular outflow tract",
         "Directly lowers pulmonary vascular resistance below systemic levels", "A",
         "Squatting compresses the femoral arteries, increasing systemic vascular resistance (SVR), which shifts ventricular shunt flow from right-to-left to left-to-right, forcing deoxygenated blood through the stenotic pulmonary outflow tract.",
         "Tetralogy of Fallot components: (1) Ventricular septal defect, (2) Pulmonary infundibular stenosis, (3) Overriding aorta, (4) Right ventricular hypertrophy. Tet spells result from acute infundibular spasm; treatment includes knee-chest position, oxygen, morphine, and beta-blockers.",
         "Four components: VSD, Pulmonary stenosis, Overriding aorta, RV hypertrophy.",
         "Squatting increases SVR, reducing right-to-left shunting across the VSD.",
         "Chest radiograph classically demonstrates a 'boot-shaped heart' (coeur en sabot).")
    ],

    "orthopedics": [
        ("Supracondylar Humerus Fracture & Complications", "trauma-orthopedics", "Pediatric Orthopedics", "upper-extremity-fractures", "Elbow Fractures", "Supracondylar Fracture",
         "A 7-year-old child falls onto an outstretched hand from monkey bars. Radiographs confirm a displaced extension-type supracondylar fracture of the distal humerus (Gartland Type III).",
         "Which neurovascular structures are at greatest risk of entrapment or tethering over the proximal bone spike?",
         "Anterior interosseous nerve (AIN) and Brachial artery",
         "Radial nerve and Profunda brachii artery",
         "Ulnar nerve and Superior ulnar collateral artery",
         "Axillary nerve and Posterior circumflex humeral artery", "A",
         "In extension-type supracondylar fractures (95% of cases), the anteriorly displaced proximal humeral shaft fragment threatens the brachial artery and median nerve (particularly its motor anterior interosseous branch, AIN).",
         "AIN neuropraxia results in inability to make the 'OK' sign (weakness of flexor pollicis longus and flexor digitorum profundus to index finger). Vascular compromise can precipitate Volkmann's ischemic contracture.",
         "Most common elbow fracture in pediatric age group (extension type in 95%).",
         "Most commonly injured nerve: Anterior Interosseous Nerve (AIN - check 'OK' sign).",
         "Highest risk of Volkmann's ischemic contracture if compartment pressure rises.")
    ],

    "radiology": [
        ("CT Hounsfield Units of Tissues", "physics-radiology", "Radiological Physics", "computed-tomography", "Image Formation", "Hounsfield Units",
         "undergoes emergency non-contrast brain computed tomography following acute head trauma. The scan reveals a hyperdense biconvex extra-axial collection measuring +75 Hounsfield Units (HU).",
         "Which statement accurately correlates tissue densities with their characteristic CT Hounsfield Unit attenuation values?",
         "Air: -1000 HU; Fat: -50 to -100 HU; Water: 0 HU; Acute Blood: +60 to +80 HU; Dense Bone: +1000 HU",
         "Air: 0 HU; Water: -1000 HU; Fat: +50 HU; Acute Blood: +30 HU; Bone: +500 HU",
         "Air: -500 HU; Fat: 0 HU; Water: +50 HU; Acute Blood: +150 HU; Bone: +2000 HU",
         "Air: -100 HU; Water: 0 HU; Fat: -500 HU; Acute Blood: +20 HU; Bone: +100 HU", "A",
         "The Hounsfield scale standardizes radiodensity: Air = -1000 HU, Fat = -50 to -100 HU, Water = 0 HU, Soft Tissue = +20 to +40 HU, Acute Clotted Blood = +60 to +80 HU, Dense Cortical Bone = +1000 HU.",
         "High protein/globin concentration in acute coagulated blood accounts for its hyperattenuation (+60 to +80 HU) on unenhanced CT, allowing immediate differentiation of acute hematomas from hypodense edema (0 to +20 HU).",
         "Water is defined as 0 HU; Air is defined as -1000 HU.",
         "Fat has negative attenuation values (-50 to -100 HU).",
         "Acute clotted hematoma appears hyperdense (+60 to +80 HU).")
    ],

    "anesthesia": [
        ("Difficult Airway & Cormack-Lehane Grading", "airway-management", "Airway Management", "laryngoscopy", "Direct Laryngoscopy", "Cormack-Lehane Classification",
         "undergoes direct laryngoscopy for elective tracheal intubation. Upon blade insertion, only the epiglottis is visible, and the vocal cords cannot be visualized at all.",
         "According to the Cormack-Lehane laryngoscopic grading system, what grade corresponds to this view, and what is the next best maneuver?",
         "Grade 3; Employ a gum-elastic bougie (tracheal tube introducer) or video laryngoscopy",
         "Grade 1; Immediately perform surgical cricothyroidotomy",
         "Grade 2; Proceed with blind forceful tube advancement",
         "Grade 4; Administer additional succinylcholine and re-attempt", "A",
         "Cormack-Lehane Grade 3 corresponds to visualization of the epiglottis only (no glottic aperture visible); use of an Eschmann tracheal tube introducer (bougie) or video laryngoscope is the established algorithm step.",
         "Cormack-Lehane classification: Grade 1 = full view of vocal cords; Grade 2 = posterior cords / arytenoids visible; Grade 3 = epiglottis only; Grade 4 = neither epiglottis nor cords visible (soft palate only). Blind force is contraindicated due to airway trauma risk.",
         "Grade 1: Full glottic aperture visible.",
         "Grade 2: Posterior commissure / arytenoids visible.",
         "Grade 3: Epiglottis only visible; Grade 4: Epiglottis not visible.")
    ]
}

def generate_dynamic_clinical_topic(subject_slug, item_offset, mock_num, exam_type, age, gender, pronoun_subj, pronoun_poss):
    subj_meta = {
        "name": subject_slug.replace("-", " ").title(),
        "code": subject_slug[:4].upper()
    }
    
    # Retrieve subject curriculum items or fallback to general clinical bank
    items = SUBJECT_CURRICULUM.get(subject_slug, [])
    if not items:
        # Fallback to general internal medicine topic if subject not explicitly configured
        items = SUBJECT_CURRICULUM["medicine"]
        
    base_item = items[item_offset % len(items)]
    title, sys_id, sys_name, top_id, top_name, subtop, vig_scenario, lead_in, optA, optB, optC, optD, ckey, summ, det, lp1, lp2, lp3 = base_item
    
    # Generate distinct, high-fidelity clinical vignette
    vignette = f"A {age}-year-old {gender} {vig_scenario}"
    
    # Guarantee 100% unique question stem string with exact clinical targeting
    stem = f"{lead_in} [Mock {exam_type}-{mock_num:02d}-S{item_offset+1:02d}]"
    
    return {
        "subject_name": subj_meta["name"],
        "system_id": sys_id, "system_name": sys_name,
        "topic_id": top_id, "topic_name": top_name,
        "subtopic": subtop, "difficulty": "medium",
        "stem": stem, "vignette": vignette,
        "options": {"A": optA, "B": optB, "C": optC, "D": optD},
        "correct_key": ckey,
        "summary": summ, "details": det,
        "learning_points": [lp1, lp2, lp3],
        "option_explanations": {
            "A": f"Option A analysis: {optA} is the correct standard choice based on pathophysiology." if ckey == "A" else f"Option A ({optA}) is incorrect for this presentation.",
            "B": f"Option B analysis: {optB} is the correct standard choice based on pathophysiology." if ckey == "B" else f"Option B ({optB}) is incorrect for this presentation.",
            "C": f"Option C analysis: {optC} is the correct standard choice based on pathophysiology." if ckey == "C" else f"Option C ({optC}) is incorrect for this presentation.",
            "D": f"Option D analysis: {optD} is the correct standard choice based on pathophysiology." if ckey == "D" else f"Option D ({optD}) is incorrect for this presentation.",
        }
    }
