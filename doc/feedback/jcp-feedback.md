# Feedback summary

Note: most comments are from reviewer 1, who did a very detailed review.
Comments from reviewer 2 are identified as such.

## Positives

* The manuscript addresses a highly relevant and timely topic \- the carbon
  footprint of IT and AI in the higher education sector. The development of a
  parameterizable model to estimate these emissions is a valuable contribution
  to the field of sustainable ICT.  
* The study correctly identifies the dominance of embodied emissions in end-user
  devices, which is a crucial and often overlooked insight.  
* The model's structure is logical, and the inclusion of a sensitivity analysis
  strengthens the findings.

* This paper presents a useful model and valuable insights, particularly on the
  significance of embodied emissions. However, to meet the high standards of the
  Journal of Cleaner Production, the authors must address the major concerns
  regarding methodological transparency, system boundaries, generalizability,
  and the depth of their policy analysis. With these revisions, the manuscript
  has the potential to become a key reference for universities worldwide
  developing their net-zero IT strategies.

## Negatives that are relatively easy to address

* The model is described as having "almost 100 configurable parameters," yet
  many key parameter values are presented without a clear, traceable
  justification or a consolidated overview. For full reproducibility, I strongly
  recommend the authors include a complete parameter table as supplementary
  material. This table should list every parameter, its default value, its
  source (e.g., manufacturer datasheet, literature citation, assumption), and
  its estimated uncertainty range.  
  * This is straightforward

* Network Emissions (10% overhead): This is a significant simplification. Please
  provide a literature reference or a bottom-up estimation (based on the 4,000
  access points) to justify this figure. A sensitivity analysis specifically on
  this parameter is crucial.  
  * There is substantial data on this, can be addressed both with a literature
    search and bottom-up estimates.

* The exclusion of application-level cloud services (Microsoft 365, Google
  Workspace) is a notable gap, as these are ubiquitous in modern universities.
  The authors acknowledge this but dismiss it by stating it would "overestimate
  the relative impact of AI." This is not a valid reason for exclusion in a
  holistic assessment. The manuscript should either: (1）Include a preliminary
  estimate of these emissions using available literature or expenditure-based
  (EIO) methods. Or (2) Explicitly discuss this as a major limitation and
  quantify, if possible, how large this omission might be relative to the totals
  reported.  
  * Can probably be addressed with EIO methods, but will require work.  

* The treatment of the supercomputing center (CSCS) is inconsistent. Operational
  emissions are included, but embodied emissions and cooling are omitted due to
  "lack of data." Given that high-performance computing is often a significant
  energy user, a more robust effort to estimate these upstream emissions (e.g.,
  using financial allocation or average server footprints) is expected.  
  * Maybe Dario’s contacts can help with this. Otherwise “hard”.  

* The University of Zurich is a very specific case due to its exceptionally
  clean electricity grid (\~50 gCO₂e/kWh) and long device lifetimes (8 years for
  university laptops). The findings, particularly the dominance of embodied
  emissions, may not hold for universities in regions with carbon-intensive
  grids (e.g., \>400 gCO₂e/kWh) or with faster device refresh cycles.  
  * Indeed, clean electricity makes the thesis of the paper easier at UZH, but
    long device times make it *harder* (the author is confused).  
  * I am listing this under “easy” because it may be possible to run sensitivity
    analyses with assumptions of dirtier grids. Otherwise “hard”.  

* The manuscript would be significantly strengthened by a scenario analysis that
  tests the model under different regional contexts (e.g., using the EU average
  electricity carbon intensity). This would demonstrate the model's broader
  applicability and show how the conclusions might change for a "typical"
  university outside of Switzerland.  
  * Seems trivial to do.  

* While the recommendations are sensible, they are currently somewhat generic.
  To enhance the practical contribution of the paper, the authors should provide
  more concrete, actionable guidance. For example: (1）On device lifetime:
  Suggest specific policies (e.g., standardized 5-year warranty requirements,
  on-campus repair clinics, buy-back programs) and quantify their potential
  impact using the model. (2）On cloud migration: Move beyond "it depends" and
  provide a decision framework. What specific questions should IT managers ask
  cloud providers (e.g., Power Usage Effectiveness guarantees, location-specific
  carbon intensity data, commitment to 100% renewable energy)?  
  * These seem like useful recommendations, which we might be able to test
    against some UZH IT staff (a limited audience)?  

* Positioning within the "Cleaner Production" Paradigm: (1）The journal
  emphasizes the transition towards cleaner production systems. The manuscript
  would benefit from explicitly framing the extension of device lifetimes as a
  core strategy for "cleaner IT consumption." This connects the findings
  directly to the circular economy and sustainable consumption literature,
  moving beyond a pure carbon accounting exercise. (2）A brief discussion on the
  indirect effects of AI (which the authors rightly note are excluded) is
  warranted. While quantifying them is difficult, acknowledging their potential
  to significantly alter other university emission sectors (e.g., smart building
  management, optimized travel) would provide a more balanced perspective and
  align with the journal's systemic view.  
  * These seem straightforward but will require some research to not be “fluff”.  

* These are all pretty trivial. I don’t know what the reviewer is talking about
  with regard to Figures 1-5.
  * 6. The abstract could be more concise. The first two sentences are very
    general and could be combined.
  * 7. Figures 1-5 are cited but not included in the manuscript draft. Their
    absence makes it difficult to fully assess the results.
  * 8. On Page 7, the assumption that mobile phones "draw no power" when
    unplugged is technically true, but the charging cycle should be explicitly
    modeled based on battery capacity and charger efficiency for greater
    accuracy.
  * 9. Ensure consistent use of units throughout (e.g., tCO₂e vs. kt CO₂e).

* \[reviewer 2\] The results section currently reports the initial findings
  well. To enhance the study's impact, it requires further development in the
  discussion, with a deeper analysis that provides greater statistical
  validation and mechanistic interpretation.  
  * Not quite clear what he wants, but seems doable.  

* \[reviewer 2\] 4.The manuscript also has formatting issues. Specifically, the
  reference list does not clearly distinguish between conference proceedings and
  journal articles, which may reduce citation accuracy and traceability.  
  * Trivial

## Negatives that are harder to address

* AI Query Volume (15/user/day): This is a core driver of the AI impact
  conclusion. This number feels arbitrary. Is this based on a campus survey,
  extrapolation from global data, or an educated guess? The justification must
  be substantially strengthened, as the central claim that "LLM impact is small"
  hinges on this.  
  * I agree with this criticism. Most convincing would be a survey, which we
    know is hard to do.  

* \[reviewer 2\] The study investigates only a single university, whose
  operational scale and emission structure may not be representative of the
  higher education sector or other institutional contexts. As a result, the
  conclusions drawn have limited external validity.  
  * At face value, we cannot address this without a broader survey. Sensitivity
    analyses (as for dirtier grids, above) would not suffice.  

* \[reviewer 2\] Several critical assumptions lack empirical support or detailed
  data justification. For instance, assumptions made by the authors in section
  3.3, and 1% of total emissions for AI adoption in section 4.2, etc. Without
  concrete measurements or verifiable baselines, the model outputs and causal
  inferences remain speculative.  
  * Not sure how to address this. Section 3.3 actually relies on the best
    available literature in the area. Section 4.2 explains the results of
    running the model with default parameters. It seems the reviewer is hostile
    and has not actually read the text carefully. 

---

# Full text of original feedback

Reviewer \#1: The manuscript addresses a highly relevant and timely topic \- the carbon footprint of IT and AI in the higher education sector. The development of a parameterizable model to estimate these emissions is a valuable contribution to the field of sustainable ICT. The study correctly identifies the dominance of embodied emissions in end-user devices, which is a crucial and often overlooked insight. The model's structure is logical, and the inclusion of a sensitivity analysis strengthens the findings.  
However, for publication in a leading journal like Journal of Cleaner Production, the manuscript must demonstrate greater methodological rigor, transparency, and critical discussion of its limitations and broader implications. The following major points should be addressed in a revision.  
Major Points of Concern:  
1.Methodological Transparency and Reproducibility:  
（1）The model is described as having "almost 100 configurable parameters," yet many key parameter values are presented without a clear, traceable justification or a consolidated overview. For full reproducibility, I strongly recommend the authors include a complete parameter table as supplementary material. This table should list every parameter, its default value, its source (e.g., manufacturer datasheet, literature citation, assumption), and its estimated uncertainty range.  
（2）Several assumptions, while necessary, are inadequately defended. For example:  
1）Network Emissions (10% overhead): This is a significant simplification. Please provide a literature reference or a bottom-up estimation (based on the 4,000 access points) to justify this figure. A sensitivity analysis specifically on this parameter is crucial.  
2）AI Query Volume (15/user/day): This is a core driver of the AI impact conclusion. This number feels arbitrary. Is this based on a campus survey, extrapolation from global data, or an educated guess? The justification must be substantially strengthened, as the central claim that "LLM impact is small" hinges on this.  
2.System Boundaries and Completeness:  
（1）The exclusion of application-level cloud services (Microsoft 365, Google Workspace) is a notable gap, as these are ubiquitous in modern universities. The authors acknowledge this but dismiss it by stating it would "overestimate the relative impact of AI." This is not a valid reason for exclusion in a holistic assessment. The manuscript should either:  
1）Include a preliminary estimate of these emissions using available literature or expenditure-based (EIO) methods.  
2）Explicitly discuss this as a major limitation and quantify, if possible, how large this omission might be relative to the totals reported.  
（2）The treatment of the supercomputing center (CSCS) is inconsistent. Operational emissions are included, but embodied emissions and cooling are omitted due to "lack of data." Given that high-performance computing is often a significant energy user, a more robust effort to estimate these upstream emissions (e.g., using financial allocation or average server footprints) is expected.  
3.Generalizability and Context-Specificity:  
（1）The University of Zurich is a very specific case due to its exceptionally clean electricity grid (\~50 gCO₂e/kWh) and long device lifetimes (8 years for university laptops). The findings, particularly the dominance of embodied emissions, may not hold for universities in regions with carbon-intensive grids (e.g., \>400 gCO₂e/kWh) or with faster device refresh cycles.  
（2）The manuscript would be significantly strengthened by a scenario analysis that tests the model under different regional contexts (e.g., using the EU average electricity carbon intensity). This would demonstrate the model's broader applicability and show how the conclusions might change for a "typical" university outside of Switzerland.  
4.Depth of Policy Recommendations:  
While the recommendations are sensible, they are currently somewhat generic. To enhance the practical contribution of the paper, the authors should provide more concrete, actionable guidance. For example:  
1）On device lifetime: Suggest specific policies (e.g., standardized 5-year warranty requirements, on-campus repair clinics, buy-back programs) and quantify their potential impact using the model.  
2）On cloud migration: Move beyond "it depends" and provide a decision framework. What specific questions should IT managers ask cloud providers (e.g., Power Usage Effectiveness guarantees, location-specific carbon intensity data, commitment to 100% renewable energy)?  
5.Positioning within the "Cleaner Production" Paradigm:  
（1）The journal emphasizes the transition towards cleaner production systems. The manuscript would benefit from explicitly framing the extension of device lifetimes as a core strategy for "cleaner IT consumption." This connects the findings directly to the circular economy and sustainable consumption literature, moving beyond a pure carbon accounting exercise.  
（2）A brief discussion on the indirect effects of AI (which the authors rightly note are excluded) is warranted. While quantifying them is difficult, acknowledging their potential to significantly alter other university emission sectors (e.g., smart building management, optimized travel) would provide a more balanced perspective and align with the journal's systemic view.  
6.The abstract could be more concise. The first two sentences are very general and could be combined.  
7.Figures 1-5 are cited but not included in the manuscript draft. Their absence makes it difficult to fully assess the results.  
8.On Page 7, the assumption that mobile phones "draw no power" when unplugged is technically true, but the charging cycle should be explicitly modeled based on battery capacity and charger efficiency for greater accuracy.  
9.Ensure consistent use of units throughout (e.g., tCO₂e vs. kt CO₂e).  
This paper presents a useful model and valuable insights, particularly on the significance of embodied emissions. However, to meet the high standards of the Journal of Cleaner Production, the authors must address the major concerns regarding methodological transparency, system boundaries, generalizability, and the depth of their policy analysis. With these revisions, the manuscript has the potential to become a key reference for universities worldwide developing their net-zero IT strategies.

Reviewer \#2: This manuscript investigates the impact of IT and AI on carbon emissions at a university scale. A primary limitation is the highly specific scope of the study, which may constrain the broader applicability and generalizability of its findings.  
1.The study investigates only a single university, whose operational scale and emission structure may not be representative of the higher education sector or other institutional contexts. As a result, the conclusions drawn have limited external validity.  
2.Several critical assumptions lack empirical support or detailed data justification. For instance, assumptions made by the authors in section 3.3, and 1% of total emissions for AI adoption in section 4.2, etc. Without concrete measurements or verifiable baselines, the model outputs and causal inferences remain speculative.  
3.The results section currently reports the initial findings well. To enhance the study's impact, it requires further development in the discussion, with a deeper analysis that provides greater statistical validation and mechanistic interpretation.  
4.The manuscript also has formatting issues. Specifically, the reference list does not clearly distinguish between conference proceedings and journal articles, which may reduce citation accuracy and traceability.
