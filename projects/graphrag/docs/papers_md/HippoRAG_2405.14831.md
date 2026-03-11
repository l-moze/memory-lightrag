---
source: https://arxiv.org/html/2405.14831
arxiv: 2405.14831
downloaded_at: 2026-03-11T05:27:31.870Z
---
HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models 

# HippoRAG: Neurobiologically Inspired 
Long-Term Memory for Large Language Models

Bernal Jiménez Gutiérrez The Ohio State University &amp;Yiheng Shu The Ohio State University Yu Gu The Ohio State University &amp;Michihiro Yasunaga Stanford University &amp;Yu Su The Ohio State University 

###### Abstract

In order to thrive in hostile and ever-changing natural environments, mammalian brains evolved to store large amounts of knowledge about the world and continually integrate new information while avoiding catastrophic forgetting. Despite their impressive accomplishments, large language models (LLMs), even with retrieval-augmented generation (RAG), still struggle to efficiently and effectively integrate a large amount of new experiences after pre-training. In this work, we introduce HippoRAG, a novel retrieval framework inspired by the hippocampal indexing theory of human long-term memory to enable deeper and more efficient knowledge integration over new experiences. HippoRAG synergistically orchestrates LLMs, knowledge graphs, and the Personalized PageRank algorithm to mimic the different roles of neocortex and hippocampus in human memory. We compare HippoRAG with existing RAG methods on multi-hop question answering (QA) and show that our method outperforms the state-of-the-art methods remarkably, by up to %. Single-step retrieval with HippoRAG achieves comparable or better performance than iterative retrieval like IRCoT while being \- times cheaper and \- times faster, and integrating HippoRAG into IRCoT brings further substantial gains. Finally, we show that our method can tackle new types of scenarios that are out of reach of existing methods. 1 1 1Code and data are available at https://github.com/OSU-NLP-Group/HippoRAG .

![Refer to caption](x1.png)

Figure 1: Knowledge Integration &amp; RAG. Tasks that require knowledge integration are particularly challenging for current RAG systems. In the above example, we want to find a Stanford professor that does Alzheimer’s research from a pool of passages describing potentially thousands Stanford professors and Alzheimer’s researchers. Since current methods encode passages in isolation, they would struggle to identify Prof. Thomas unless a passage mentions both characteristics at once. In contrast, most people familiar with this professor would remember him quickly due to our brain’s associative memory capabilities, thought to be driven by the index structure depicted in the C-shaped hippocampus above (in blue). Inspired by this mechanism, HippoRAG allows LLMs to build and leverage a similar graph of associations to tackle knowledge integration tasks.

## 1 Introduction

Millions of years of evolution have led mammalian brains to develop the crucial ability to store large amounts of world knowledge and continuously integrate new experiences without losing previous ones. This exceptional long-term memory system eventually allows us humans to keep vast stores of continuously updating knowledge that forms the basis of our reasoning and decision making \[[19](https://arxiv.org/html/2405.14831v3#bib.bib19)\].

Despite the progress of large language models (LLMs) in recent years, such a continuously updating long-term memory is still conspicuously absent from current AI systems. Due in part to its ease of use and the limitations of other techniques such as model editing \[[46](https://arxiv.org/html/2405.14831v3#bib.bib46)\], retrieval-augmented generation (RAG) has become the de facto solution for long-term memory in LLMs, allowing users to present new knowledge to a static model \[[36](https://arxiv.org/html/2405.14831v3#bib.bib36), [42](https://arxiv.org/html/2405.14831v3#bib.bib42), [66](https://arxiv.org/html/2405.14831v3#bib.bib66), [87](https://arxiv.org/html/2405.14831v3#bib.bib87)\].

However, current RAG methods are still unable to help LLMs perform tasks that require integrating new knowledge across passage boundaries since each new passage is encoded in isolation. Many important real-world tasks, such as scientific literature review, legal case briefing, and medical diagnosis, require knowledge integration across passages or documents. Although less complex, standard multi-hop question answering (QA) also requires integrating information between passages in a retrieval corpus. In order to solve such tasks, current RAG systems resort to using multiple retrieval and LLM generation steps iteratively to join disparate passages \[[64](https://arxiv.org/html/2405.14831v3#bib.bib64), [78](https://arxiv.org/html/2405.14831v3#bib.bib78)\]. Nevertheless, even perfectly executed multi-step RAG is still oftentimes insufficient to accomplish many scenarios of knowledge integration, as we illustrate in what we call path-finding multi-hop questions in Figure [1](https://arxiv.org/html/2405.14831v3#S0.F1 "Figure 1 ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

In contrast, our brains are capable of solving challenging knowledge integration tasks like these with relative ease. The hippocampal memory indexing theory \[[75](https://arxiv.org/html/2405.14831v3#bib.bib75)\], a well-established theory of human long-term memory, offers one plausible explanation for this remarkable ability. Teyler and Discenna \[[75](https://arxiv.org/html/2405.14831v3#bib.bib75)\] propose that our powerful context-based, continually updating memory relies on interactions between the neocortex, which processes and stores actual memory representations, and the C-shaped hippocampus, which holds the hippocampal index, a set of interconnected indices which point to memory units on the neocortex and stores associations between them \[[19](https://arxiv.org/html/2405.14831v3#bib.bib19), [76](https://arxiv.org/html/2405.14831v3#bib.bib76)\].

In this work, we propose HippoRAG, a RAG framework that serves as a long-term memory for LLMs by mimicking this model of human memory. Our novel design first models the neocortex’s ability to process perceptual input by using an LLM to transform a corpus into a schemaless knowledge graph (KG) as our artificial hippocampal index. Given a new query, HippoRAG identifies the key concepts in the query and runs the Personalized PageRank (PPR) algorithm \[[30](https://arxiv.org/html/2405.14831v3#bib.bib30)\] on the KG, using the query concepts as the seeds, to integrate information across passages for retrieval. PPR enables HippoRAG to explore KG paths and identify relevant subgraphs, essentially performing multi-hop reasoning in a single retrieval step.

This capacity for single-step multi-hop retrieval yields strong performance improvements of around and points over current RAG methods \[[10](https://arxiv.org/html/2405.14831v3#bib.bib10), [35](https://arxiv.org/html/2405.14831v3#bib.bib35), [53](https://arxiv.org/html/2405.14831v3#bib.bib53), [70](https://arxiv.org/html/2405.14831v3#bib.bib70), [71](https://arxiv.org/html/2405.14831v3#bib.bib71)\] on two popular multi-hop QA benchmarks, MuSiQue \[[77](https://arxiv.org/html/2405.14831v3#bib.bib77)\] and 2WikiMultiHopQA \[[33](https://arxiv.org/html/2405.14831v3#bib.bib33)\]. Additionally, HippoRAG’s online retrieval process is to times cheaper and to times faster than current iterative retrieval methods like IRCoT \[[78](https://arxiv.org/html/2405.14831v3#bib.bib78)\], while still achieving comparable performance. Furthermore, our approach can be combined with IRCoT to provide complementary gains of up to % and % on the same datasets and even obtain improvements on HotpotQA, a less challenging multi-hop QA dataset. Finally, we provide a case study illustrating the limitations of current methods as well as our method’s potential on the previously discussed path-finding multi-hop QA setting.

## 2 HippoRAG

In this section, we first give a brief overview of the hippocampal memory indexing theory, followed by how HippoRAG’s indexing and retrieval design was inspired by this theory, and finally offer a more detailed account of our methodology.

### 2.1 The Hippocampal Memory Indexing Theory

The hippocampal memory indexing theory \[[75](https://arxiv.org/html/2405.14831v3#bib.bib75)\] is a well-established theory that provides a functional description of the components and circuitry involved in human long-term memory. In this theory, Teyler and Discenna \[[75](https://arxiv.org/html/2405.14831v3#bib.bib75)\] propose that human long-term memory is composed of three components that work together to accomplish two main objectives: pattern separation, which ensures that the representations of distinct perceptual experiences are unique, and pattern completion, which enables the retrieval of complete memories from partial stimuli \[[19](https://arxiv.org/html/2405.14831v3#bib.bib19), [76](https://arxiv.org/html/2405.14831v3#bib.bib76)\].

The theory suggests that pattern separation is primarily accomplished in the memory encoding process, which starts with the neocortex receiving and processing perceptual stimuli into more easily manipulatable, likely higher-level, features, which are then routed through the parahippocampal regions (PHR) to be indexed by the hippocampus. When they reach the hippocampus, salient signals are included in the hippocampal index and associated with each other.

After the memory encoding process is completed, pattern completion drives the memory retrieval process whenever the hippocampus receives partial perceptual signals from the PHR pipeline. The hippocampus then leverages its context-dependent memory system, thought to be implemented through a densely connected network of neurons in the CA3 sub-region \[[76](https://arxiv.org/html/2405.14831v3#bib.bib76)\], to identify complete and relevant memories within the hippocampal index and route them back through the PHR for simulation in the neocortex. Thus, this complex process allows for new information to be integrated by changing only the hippocampal index instead of updating neocortical representations.

### 2.2 Overview

Our proposed approach, HippoRAG, is closely inspired by the process described above. As shown in Figure [4](https://arxiv.org/html/2405.14831v3#footnote4 "footnote 4 ‣ Figure 2 ‣ 2.3 Detailed Methodology ‣ 2 HippoRAG ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), each component of our method corresponds to one of the three components of human long-term memory. A detailed example of the HippoRAG process can be found in Appendix [A](https://arxiv.org/html/2405.14831v3#A1 "Appendix A HippoRAG Pipeline Example ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

Offline Indexing. Our offline indexing phase, analogous to memory encoding, starts by leveraging a strong instruction-tuned LLM, our artificial neocortex, to extract knowledge graph (KG) triples. The KG is schemaless and this process is known as open information extraction (OpenIE) \[[3](https://arxiv.org/html/2405.14831v3#bib.bib3), [5](https://arxiv.org/html/2405.14831v3#bib.bib5), [60](https://arxiv.org/html/2405.14831v3#bib.bib60), [98](https://arxiv.org/html/2405.14831v3#bib.bib98)\]. This process extracts salient signals from passages in a retrieval corpus as discrete noun phrases rather than dense vector representations, allowing for more fine-grained pattern separation. It is therefore natural to define our artificial hippocampal index as this open KG, which is built on the whole retrieval corpus passage-by-passage. Finally, to connect both components as is done by the parahippocampal regions, we use off-the-shelf dense encoders fine-tuned for retrieval (retrieval encoders). These retrieval encoders provide additional edges between similar but not identical noun phrases within this KG to aid in downstream pattern completion.

Online Retrieval. These same three components are then leveraged to perform online retrieval by mirroring the human brain’s memory retrieval process. Just as the hippocampus receives input processed through the neocortex and PHR, our LLM-based neocortex extracts a set of salient named entities from a query which we call query named entities. These named entities are then linked to nodes in our KG based on the similarity determined by retrieval encoders; we refer to these selected nodes as query nodes. Once the query nodes are chosen, they become the partial cues from which our synthetic hippocampus performs pattern completion. In the hippocampus, neural pathways between elements of the hippocampal index enable relevant neighborhoods to become activated and recalled upstream. To imitate this efficient graph search process, we leverage the Personalized PageRank (PPR) algorithm \[[30](https://arxiv.org/html/2405.14831v3#bib.bib30)\], a version of PageRank that distributes probability across a graph only through a set of user-defined source nodes. This constraint allows us to bias the PPR output only towards the set of query nodes, just as the hippocampus extracts associated signals from specific partial cues. 2 2 2Intriguingly, some work in cognitive science has also found a correlation between human word recall and the output of the PageRank algorithm [ 25 ]. Finally, as is done when the hippocampal signal is sent upstream, we aggregate the output PPR node probability over the previously indexed passages and use that to rank them for retrieval.

### 2.3 Detailed Methodology

Offline Indexing. Our indexing process involves processing a set of passages using an instruction-tuned LLM and a retrieval encoder . As seen in Figure [4](https://arxiv.org/html/2405.14831v3#footnote4 "footnote 4 ‣ Figure 2 ‣ 2.3 Detailed Methodology ‣ 2 HippoRAG ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") we first use to extract a set of noun phrase nodes and relation edges from each passage in via OpenIE. This process is done via 1-shot prompting of the LLM with the prompts shown in Appendix [I](https://arxiv.org/html/2405.14831v3#A9 "Appendix I LLM Prompts ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). Specifically, we first extract a set of named entities from each passage. We then add the named entities to the OpenIE prompt to extract the final triples, which also contain concepts (noun phrases) beyond named entities. We find that this two-step prompt configuration leads to an appropriate balance between generality and bias towards named entities. Finally, we use to add the extra set of synonymy relations discussed above when the cosine similarity between two entity representations in is above a threshold . As stated above, this introduces more edges to our hippocampal index and allows for more effective pattern completion. This indexing process defines a matrix , which contains the number of times each noun phrase in the KG appears in each original passage.

Online Retrieval. During the retrieval process, we prompt using a 1-shot prompt to extract a set of named entities from a query , our previously defined query named entities (Stanford and Alzheimer’s in our Figure [4](https://arxiv.org/html/2405.14831v3#footnote4 "footnote 4 ‣ Figure 2 ‣ 2.3 Detailed Methodology ‣ 2 HippoRAG ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") example). These named entities from the query are then encoded by the same retrieval encoder . Then, the previously defined query nodes are chosen as the set of nodes in with the highest cosine similarity to the query named entities . More formally, query nodes are defined as such that where , represented as the Stanford logo and the Alzheimer’s purple ribbon symbol in Figure [4](https://arxiv.org/html/2405.14831v3#footnote4 "footnote 4 ‣ Figure 2 ‣ 2.3 Detailed Methodology ‣ 2 HippoRAG ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

![Refer to caption](x2.png)

Figure 2: Detailed HippoRAG Methodology. We model the three components of human long-term memory to mimic its pattern separation and completion functions. For offline indexing (Middle), we use an LLM to process passages into open KG triples, which are then added to our artificial hippocampal index, while our synthetic parahippocampal regions (PHR) detect synonymy. In the example above, triples involving Professor Thomas are extracted and integrated into the KG. For online retrieval (Bottom), our LLM neocortex extracts named entities from a query while our parahippocampal retrieval encoders link them to our hippocampal index. We then leverage the Personalized PageRank algorithm to enable context-based retrieval and extract Professor Thomas. 4 4 4Many details around the hippocampal memory indexing theory are omitted from this study for simplicity. We encourage interested reader to follow the references in § 2.1 for more.

After the query nodes are found, we run the PPR algorithm over the hippocampal index, i.e., a KG with nodes and edges (triple-based and synonymy-based), using a personalized probability distribution defined over , in which each query node has equal probability and all other nodes have a probability of zero. This allows probability mass to be distributed to nodes that are primarily in the (joint) neighborhood of the query nodes, such as Professor Thomas, and contribute to eventual retrieval. After running the PPR algorithm, we obtain an updated probability distribution over . Finally, in order to obtain passage scores, we multiply with the previously defined matrix to obtain , a ranking score for each passage, which we use for retrieval.

Node Specificity. We introduce node specificity as a neurobiologically plausible way to further improve retrieval. It is well known that global signals for word importance, like inverse document frequency (IDF), can improve information retrieval. However, in order for our brain to leverage IDF for retrieval, the number of total “passages” encoded would need to be aggregated with all node activations before memory retrieval is complete. While simple for normal computers, this process would require activating connections between an aggregator neuron and all nodes in the hippocampal index every time retrieval occurs, likely introducing prohibitive computational overhead. Given these constraints, we propose node specificity as an alternative IDF signal which requires only local signals and is thus more neurobiologically plausible. We define the node specificity of node as , where is the set of passages in from which node was extracted, information that is already available at each node. Node specificity is used in retrieval by multiplying each query node probability with before PPR; this allows us to modulate each of their neighborhood’s probability as well as their own. We illustrate node specificity in Figure [4](https://arxiv.org/html/2405.14831v3#footnote4 "footnote 4 ‣ Figure 2 ‣ 2.3 Detailed Methodology ‣ 2 HippoRAG ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") through relative symbol size: the Stanford logo grows larger than the Alzheimer’s symbol since it appears in fewer documents.

## 3 Experimental Setup

### 3.1 Datasets

We evaluate our method’s retrieval capabilities primarily on two challenging multi-hop QA benchmarks, MuSiQue (answerable) \[[77](https://arxiv.org/html/2405.14831v3#bib.bib77)\] and 2WikiMultiHopQA \[[33](https://arxiv.org/html/2405.14831v3#bib.bib33)\]. For completeness, we also include the HotpotQA \[[89](https://arxiv.org/html/2405.14831v3#bib.bib89)\] dataset even though it has been found to be a much weaker test for multi-hop reasoning due to many spurious signals \[[77](https://arxiv.org/html/2405.14831v3#bib.bib77)\], as we also show in Appendix [B](https://arxiv.org/html/2405.14831v3#A2 "Appendix B Dataset Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). To limit the experimental cost, we extract questions from each validation set as done in previous work \[[63](https://arxiv.org/html/2405.14831v3#bib.bib63), [78](https://arxiv.org/html/2405.14831v3#bib.bib78)\]. In order to create a more realistic retrieval setting, we follow IRCoT \[[78](https://arxiv.org/html/2405.14831v3#bib.bib78)\] and collect all candidate passages (including supporting and distractor passages) from our selected questions and form a retrieval corpus for each dataset. The details of these datasets are shown in Table [1](https://arxiv.org/html/2405.14831v3#S3.T1 "Table 1 ‣ 3.1 Datasets ‣ 3 Experimental Setup ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

Table 1: Retrieval corpora and extracted KG statistics for each of our question dev sets.

MuSiQue

2Wiki

HotpotQA

# of Passages ( )







# of Unique Nodes ( )







# of Unique Edges ( )







# of Unique Triples







# of Contriever Synonym Edges ( )







# of ColBERTv2 Synonym Edges ( )







### 3.2 Baselines

We compare against several strong and widely used retrieval methods: BM25 \[[69](https://arxiv.org/html/2405.14831v3#bib.bib69)\], Contriever \[[35](https://arxiv.org/html/2405.14831v3#bib.bib35)\], GTR \[[53](https://arxiv.org/html/2405.14831v3#bib.bib53)\] and ColBERTv2 \[[70](https://arxiv.org/html/2405.14831v3#bib.bib70)\]. Additionally, we compare against two recent LLM-augmented baselines: Propositionizer \[[10](https://arxiv.org/html/2405.14831v3#bib.bib10)\], which rewrites passages into propositions, and RAPTOR \[[71](https://arxiv.org/html/2405.14831v3#bib.bib71)\], which constructs summary nodes to ease retrieval from long documents. In addition to the single-step retrieval methods above, we also include the multi-step retrieval method IRCoT \[[78](https://arxiv.org/html/2405.14831v3#bib.bib78)\] as a baseline.

### 3.3 Metrics

We report retrieval and QA performance on the datasets above using recall@2 and recall@5 (R@2 and R@5 below) for retrieval and exact match (EM) and F1 scores for QA performance.

### 3.4 Implementation Details

By default, we use GPT-3.5-turbo-1106 \[[55](https://arxiv.org/html/2405.14831v3#bib.bib55)\] with temperature of as our LLM and Contriever \[[35](https://arxiv.org/html/2405.14831v3#bib.bib35)\] or ColBERTv2 \[[70](https://arxiv.org/html/2405.14831v3#bib.bib70)\] as our retriever . We use examples from MuSiQue’s training data to tune HippoRAG’s two hyperparameters: the synonymy threshold at and the PPR damping factor at , which determines the probability that PPR will restart a random walk from the query nodes instead of continuing to explore the graph. Generally, we find that HippoRAG’s performance is rather robust to its hyperparameters. More implementation details can be found in Appendix [H](https://arxiv.org/html/2405.14831v3#A8 "Appendix H Implementation Details & Compute Requirements ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

## 4 Results

We present our retrieval and QA experimental results below. Given that our method indirectly affects QA performance, we report QA results on our best-performing retrieval backbone ColBERTv2 \[[70](https://arxiv.org/html/2405.14831v3#bib.bib70)\]. However, we report retrieval results for several strong single-step and multi-step retrieval techniques.

Table 2: Single-step retrieval performance. HippoRAG outperforms all baselines on MuSiQue and 2WikiMultiHopQA and achieves comparable performance on the less challenging HotpotQA dataset.

MuSiQue

2Wiki

HotpotQA

Average

R@2

R@5

R@2

R@5

R@2

R@5

R@2

R@5

BM25&nbsp; [[69](https://arxiv.org/html/2405.14831v3#bib.bib69)]

















Contriever&nbsp; [[35](https://arxiv.org/html/2405.14831v3#bib.bib35)]

















GTR&nbsp; [[53](https://arxiv.org/html/2405.14831v3#bib.bib53)]

















ColBERTv2&nbsp; [[70](https://arxiv.org/html/2405.14831v3#bib.bib70)]

















RAPTOR&nbsp; [[71](https://arxiv.org/html/2405.14831v3#bib.bib71)]

















RAPTOR (ColBERTv2)

















Proposition&nbsp; [[10](https://arxiv.org/html/2405.14831v3#bib.bib10)]

















Proposition (ColBERTv2)

















HippoRAG (Contriever)

















HippoRAG (ColBERTv2)

















Table 3: Multi-step retrieval performance. Combining HippoRAG with standard multi-step retrieval methods like IRCoT results in strong complementary improvements on all three datasets.

MuSiQue

2Wiki

HotpotQA

Average

R@2

R@5

R@2

R@5

R@2

R@5

R@2

R@5

IRCoT + BM25 (Default)

















IRCoT + Contriever

















IRCoT + ColBERTv2

















IRCoT + HippoRAG (Contriever)

















IRCoT + HippoRAG (ColBERTv2)

















Single-Step Retrieval Results. As seen in Table [2](https://arxiv.org/html/2405.14831v3#S4.T2 "Table 2 ‣ 4 Results ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), HippoRAG outperforms all other methods, including recent LLM-augmented baselines such as Propositionizer and RAPTOR, on our main datasets, MuSiQue and 2WikiMultiHopQA, while achieving competitive performance on HotpotQA. We notice an impressive improvement of and % for R@2 and R@5 on 2WikiMultiHopQA and around % on MuSiQue. This difference can be partially explained by 2WikiMultiHopQA’s entity-centric design, which is particularly well-suited for HippoRAG. Our lower performance on HotpotQA is mainly due to its lower knowledge integration requirements, as explained in Appendix [B](https://arxiv.org/html/2405.14831v3#A2 "Appendix B Dataset Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), as well as a due to a concept-context tradeoff which we alleviate with an ensembling technique described in Appendix [F.2](https://arxiv.org/html/2405.14831v3#A6.SS2 "F.2 Concepts vs. Context Tradeoff ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

Multi-Step Retrieval Results. For multi-step or iterative retrieval, our experiments in Table [3](https://arxiv.org/html/2405.14831v3#S4.T3 "Table 3 ‣ 4 Results ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") demonstrate that IRCoT \[[78](https://arxiv.org/html/2405.14831v3#bib.bib78)\] and HippoRAG are complementary. Using HippoRAG as the retriever for IRCoT continues to bring R@5 improvements of around % for MuSiQue, % for 2WikiMultiHopQA and an additional % on HotpotQA.

Table 4: QA performance. HippoRAG’s QA improvements correlate with its retrieval improvements on single-step (rows 1-3) and multi-step retrieval (rows 4-5).

MuSiQue

2Wiki

HotpotQA

Average

Retriever

EM

F1

EM

F1

EM

F1

EM

F1

None

















ColBERTv2

















HippoRAG (ColBERTv2)

















IRCoT (ColBERTv2)

















IRCoT + HippoRAG (ColBERTv2)

















Question Answering Results. We report QA results for HippoRAG, the strongest retrieval baselines, ColBERTv2 and IRCoT, as well as IRCoT using HippoRAG as a retriever in Table [4](https://arxiv.org/html/2405.14831v3#S4.T4 "Table 4 ‣ 4 Results ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). As expected, improved retrieval performance in both single and multi-step settings leads to strong overall improvements of up to %, % and % F1 scores on MuSiQue, 2WikiMultiHopQA and HotpotQA respectively using the same QA reader. Notably, single-step HippoRAG is on par or outperforms IRCoT while being \- times cheaper and \- times faster during online retrieval (Appendix [G](https://arxiv.org/html/2405.14831v3#A7 "Appendix G Cost and Efficiency Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models")).

## 5 Discussions

### 5.1 What Makes HippoRAG Work?

Table 5: Dissecting HippoRAG. To understand what makes it work well, we replace its OpenIE module and PPR with plausible alternatives and ablate node specificity and synonymy-based edges.

MuSiQue

2Wiki

HotpotQA

Average

R@2

R@5

R@2

R@5

R@2

R@5

R@2

R@5

HippoRAG

















OpenIE Alternatives

REBEL [[34](https://arxiv.org/html/2405.14831v3#bib.bib34)]

















Llama-3.1-8B-Instruct [[1](https://arxiv.org/html/2405.14831v3#bib.bib1)]

















Llama-3.1-70B-Instruct [[1](https://arxiv.org/html/2405.14831v3#bib.bib1)]

















PPR Alternatives

 Nodes Only

















 Nodes &amp; Neighbors

















Ablations

w/o Node Specificity

















w/o Synonymy Edges

















OpenIE Alternatives. To determine if using a closed model like GPT-3.5 is essential to retain our performance improvements, we replace it with an end-to-end OpenIE model REBEL \[[34](https://arxiv.org/html/2405.14831v3#bib.bib34)\] as well as the 8B and 70B instruction-tuned versions of Llama-3.1, a class of strong open-weight LLMs \[[1](https://arxiv.org/html/2405.14831v3#bib.bib1)\]. As shown in Table [5](https://arxiv.org/html/2405.14831v3#S5.T5 "Table 5 ‣ 5.1 What Makes HippoRAG Work? ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") row 2, building our KG using REBEL results in large performance drops, underscoring the importance of LLM flexibility. Specifically, GPT-3.5 produces twice as many triples as REBEL, indicating its bias against producing triples with general concepts and leaving many useful associations behind.

In terms of open-weight LLMs, Table [5](https://arxiv.org/html/2405.14831v3#S5.T5 "Table 5 ‣ 5.1 What Makes HippoRAG Work? ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") (rows 3-4) shows that the performance of Llama-3.1-8B is competitive with GPT-3.5 in all datasets except for 2Wiki, where performance drops substantially. Nevertheless, the stronger 70B counterpart outperforms GPT-3.5 in two out of three datasets and is still competitive in 2Wiki. The strong performance of Llama-3.1-70B and the comparable performance of even the 8B model is encouraging since it offers a cheaper alternative for indexing over large corpora. The graph statistics for these OpenIE alternatives can be found in Appendix [C](https://arxiv.org/html/2405.14831v3#A3 "Appendix C Ablation Statistics ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

To understand the relationship between OpenIE and retrieval performance more deeply, we extract 239 gold triples from 20 examples from the MuSiQue training set. We then perform a small-scale intrinsic evaluation using the CaRB \[[6](https://arxiv.org/html/2405.14831v3#bib.bib6)\] framework for OpenIE. We find that both Llama-3.1-Instruct models underperform GPT-3.5 slightly on this intrinsic evaluation but all LLMs vastly outperform REBEL. More details about this evaluation experiments can be found in Appendix [D](https://arxiv.org/html/2405.14831v3#A4 "Appendix D Intrinsic OpenIE Evaluation ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

PPR Alternatives. As shown in Table [5](https://arxiv.org/html/2405.14831v3#S5.T5 "Table 5 ‣ 5.1 What Makes HippoRAG Work? ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") (rows 5-6), to examine how much of our results are due to the strength of PPR, we replace the PPR output with the query node probability multiplied by node specificity values (row 5) and a version of this that also distributes a small amount of probability to the direct neighbors of each query node (row 6). First, we find that PPR is a much more effective method for including associations for retrieval on all three datasets compared to both simple baselines. It is interesting to note that adding the neighborhood of nodes without PPR leads to worse performance than only using the query nodes themselves.

Ablations. As seen in Table [5](https://arxiv.org/html/2405.14831v3#S5.T5 "Table 5 ‣ 5.1 What Makes HippoRAG Work? ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") (rows 7-8), node specificity obtains considerable improvements on MuSiQue and HotpotQA and yields almost no change in 2WikiMultiHopQA. This is likely because 2WikiMultiHopQA relies on named entities with little differences in terms of term weighting. In contrast, synonymy edges have the largest effect on 2WikiMultiHopQA, suggesting that noisy entity standardization is useful when most relevant concepts are named entities, and improvements to synonymy detection could lead to stronger performance in other datasets.

### 5.2 HippoRAG’s Advantage: Single-Step Multi-Hop Retrieval

A major advantage of HippoRAG over conventional RAG methods in multi-hop QA is its ability to perform multi-hop retrieval in a single step. We demonstrate this by measuring the percentage of queries where all the supporting passages are retrieved successfully, a feat that can only be accomplished through successful multi-hop reasoning. Table [6](https://arxiv.org/html/2405.14831v3#S5.T6 "Table 6 ‣ 5.2 HippoRAG’s Advantage: Single-Step Multi-Hop Retrieval ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") below shows that the gap between our method and ColBERTv2, using the top- passages, increases even more from % to % on MuSiQue and from % to % on 2WikiMultiHopQA, suggesting that large improvements come from obtaining all supporting documents rather than achieving partially retrieval on more questions.

Table 6: All-Recall metric. We measure the percentage of queries for which all supporting passages are successfully retrieved (all-recall, denoted as AR@2 or AR@5) and find even larger performance improvements for HippoRAG.

MuSiQue

2Wiki

HotpotQA

Average

AR@2

AR@5

AR@2

AR@5

AR@2

AR@5

AR@2

AR@5

ColBERTv2&nbsp; [[70](https://arxiv.org/html/2405.14831v3#bib.bib70)]

















HippoRAG

















We further illustrate HippoRAG’s unique single-step multi-hop retrieval ability through the first example in Table [7](https://arxiv.org/html/2405.14831v3#S5.T7 "Table 7 ‣ 5.2 HippoRAG’s Advantage: Single-Step Multi-Hop Retrieval ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). In this example, even though Alhandra was not mentioned in Vila de Xira’s passage, HippoRAG can directly leverage Vila de Xira’s connection to Alhandra as his place of birth to determine its importance, something that standard RAG methods would be unable to do directly. Additionally, even though IRCoT can also solve this multi-hop retrieval problem, as shown in Appendix [G](https://arxiv.org/html/2405.14831v3#A7 "Appendix G Cost and Efficiency Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), it is \- times more expensive and \- times slower than ours in terms of online retrieval, arguably the most important factor when it comes to serving end users.

Table 7: Multi-hop question types. We show example results for different approaches on path-finding vs. path-following multi-hop questions.

Question

HippoRAG

ColBERTv2

IRCoT

Path-

Following

In which

district was

Alhandra

born?

1. Alhandra

2. Vila de Xira

3. Portugal

1. Alhandra

2. Dimuthu

Abayakoon

3. Ja‘ar

1. Alhandra

2. Vila de Xira

3. Póvoa de

Santa Iria

Path-

Finding

Which Stanford

professor works on

the neuroscience

of Alzheimer’s?

1. Thomas Südhof

2. Karl Deisseroth

3. Robert Sapolsky

1. Brian Knutson

2. Eric Knudsen

3. Lisa Giocomo

1. Brian Knutson

2. Eric Knudsen

3. Lisa Giocomo

### 5.3 HippoRAG’s Potential: Path-Finding Multi-Hop Retrieval

The second example in Table [7](https://arxiv.org/html/2405.14831v3#S5.T7 "Table 7 ‣ 5.2 HippoRAG’s Advantage: Single-Step Multi-Hop Retrieval ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), also present in Figure [1](https://arxiv.org/html/2405.14831v3#S0.F1 "Figure 1 ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), shows a type of questions that is trivial for informed humans but out of reach for current retrievers without further training. This type of questions, which we call path-finding multi-hop questions, requires identifying one path between a set of entities when many paths exist to explore instead of following a specific path, as in standard multi-hop questions. 5 5 5Path-finding questions require knowledge integration when search entities like Stanford and Alzheimer’s do not happen to appear together in a passage, a condition which is often satisfied for new information.

More specifically, a simple iterative process can retrieve the appropriate passages for the first question by following the one path set by Alhandra’s one place of birth, as seen by IRCoT’s perfect performance. However, an iterative process would struggle to answer the second question given the many possible paths to explore—either through professors at Stanford University or professors working on the neuroscience of Alzheimer’s. It is only by associating disparate information about Thomas Südhof that someone who knows about this professor would be able to answer this question easily. As seen in Table [7](https://arxiv.org/html/2405.14831v3#S5.T7 "Table 7 ‣ 5.2 HippoRAG’s Advantage: Single-Step Multi-Hop Retrieval ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), both ColBERTv2 and IRCoT fail to extract the necessary passages since they cannot access these associations. On the other hand, HippoRAG leverages its web of associations in its hippocampal index and graph search algorithm to determine that Professor Thomas is relevant to this query and retrieves his passages appropriately. More examples of these path-finding multi-hop questions can be found in our case study in Appendix [E](https://arxiv.org/html/2405.14831v3#A5 "Appendix E Case Study on Path-Finding Multi-Hop QA ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

## 6 Related Work

### 6.1 LLM Long-Term Memory

Parametric Long-Term Memory. It is well-accepted, even among skeptical researchers, that the parameters of modern LLMs encode a remarkable amount of world knowledge \[[2](https://arxiv.org/html/2405.14831v3#bib.bib2), [12](https://arxiv.org/html/2405.14831v3#bib.bib12), [23](https://arxiv.org/html/2405.14831v3#bib.bib23), [28](https://arxiv.org/html/2405.14831v3#bib.bib28), [31](https://arxiv.org/html/2405.14831v3#bib.bib31), [39](https://arxiv.org/html/2405.14831v3#bib.bib39), [62](https://arxiv.org/html/2405.14831v3#bib.bib62), [79](https://arxiv.org/html/2405.14831v3#bib.bib79)\], which can be leveraged by an LLM in flexible and robust ways \[[81](https://arxiv.org/html/2405.14831v3#bib.bib81), [83](https://arxiv.org/html/2405.14831v3#bib.bib83), [93](https://arxiv.org/html/2405.14831v3#bib.bib93)\]. Nevertheless, our ability to update this vast knowledge store, an essential part of any long-term memory system, is still surprisingly limited. Although many techniques to update LLMs exist, such as standard fine-tuning, model editing \[[15](https://arxiv.org/html/2405.14831v3#bib.bib15), [49](https://arxiv.org/html/2405.14831v3#bib.bib49), [50](https://arxiv.org/html/2405.14831v3#bib.bib50), [51](https://arxiv.org/html/2405.14831v3#bib.bib51), [52](https://arxiv.org/html/2405.14831v3#bib.bib52), [95](https://arxiv.org/html/2405.14831v3#bib.bib95)\] and even external parametric memory modules inspired by human memory \[[58](https://arxiv.org/html/2405.14831v3#bib.bib58), [82](https://arxiv.org/html/2405.14831v3#bib.bib82), [32](https://arxiv.org/html/2405.14831v3#bib.bib32)\], no methodology has yet to emerge as a robust solution for continual learning in LLMs \[[26](https://arxiv.org/html/2405.14831v3#bib.bib26), [46](https://arxiv.org/html/2405.14831v3#bib.bib46), [97](https://arxiv.org/html/2405.14831v3#bib.bib97)\].

RAG as Long-Term Memory. On the other hand, using RAG methods as a long-term memory system offers a simple way to update knowledge over time \[[36](https://arxiv.org/html/2405.14831v3#bib.bib36), [42](https://arxiv.org/html/2405.14831v3#bib.bib42), [66](https://arxiv.org/html/2405.14831v3#bib.bib66), [73](https://arxiv.org/html/2405.14831v3#bib.bib73)\]. More sophisticated RAG methods, which perform multiple steps of retrieval and generation from an LLM, are even able to integrate information across new or updated knowledge elements\[[38](https://arxiv.org/html/2405.14831v3#bib.bib38), [64](https://arxiv.org/html/2405.14831v3#bib.bib64), [72](https://arxiv.org/html/2405.14831v3#bib.bib72), [78](https://arxiv.org/html/2405.14831v3#bib.bib78), [88](https://arxiv.org/html/2405.14831v3#bib.bib88), [90](https://arxiv.org/html/2405.14831v3#bib.bib90), [92](https://arxiv.org/html/2405.14831v3#bib.bib92)\], another crucial aspect of long-term memory systems. As discussed above, however, this type of online information integration is unable to solve the more complex knowledge integration tasks that we illustrate with our path-finding multi-hop QA examples.

Some other methods, such as RAPTOR \[[71](https://arxiv.org/html/2405.14831v3#bib.bib71)\], MemWalker \[[9](https://arxiv.org/html/2405.14831v3#bib.bib9)\] and GraphRAG \[[18](https://arxiv.org/html/2405.14831v3#bib.bib18)\], integrate information during the offline indexing phase similarly to HippoRAG and might be able to handle these more complex tasks. However, these methods integrate information by summarizing knowledge elements, which means that the summarization process must be repeated any time new data is added. In contrast, HippoRAG can continuously integrate new knowledge by simply adding edges to its KG.

Long Context as Long-Term Memory. Context lengths for both open and closed source LLMs have increased dramatically in the past year \[[11](https://arxiv.org/html/2405.14831v3#bib.bib11), [17](https://arxiv.org/html/2405.14831v3#bib.bib17), [22](https://arxiv.org/html/2405.14831v3#bib.bib22), [61](https://arxiv.org/html/2405.14831v3#bib.bib61), [68](https://arxiv.org/html/2405.14831v3#bib.bib68)\]. This scaling trend seems to indicate that future LLMs could perform long-term memory storage within massive context windows. However, the viability of this future remains largely uncertain given the many engineering hurdles involved and the apparent limitations of long-context LLMs, even within current context lengths \[[41](https://arxiv.org/html/2405.14831v3#bib.bib41), [45](https://arxiv.org/html/2405.14831v3#bib.bib45), [96](https://arxiv.org/html/2405.14831v3#bib.bib96), [21](https://arxiv.org/html/2405.14831v3#bib.bib21)\].

### 6.2 Multi-Hop QA & Graphs

Many previous works have also tackled multi-hop QA using graph structures. These efforts can be broadly divided in two major categories: 1) graph-augmented reading comprehension, where a graph is extracted from retrieved documents and used to improve a model’s reasoning process and 2) graph-augmented retrieval, where models find relevant documents by traversing a graph structure.

Graph-Augmented Reading Comprehension. Earlier works in this category are mainly supervised methods which mix signal from a hyperlink or co-occurrence graph with a language model through a graph neural network (GNN) \[[20](https://arxiv.org/html/2405.14831v3#bib.bib20), [67](https://arxiv.org/html/2405.14831v3#bib.bib67), [65](https://arxiv.org/html/2405.14831v3#bib.bib65)\]. More recent works use LLMs and introduce knowledge graph triples directly into the LLM prompt \[[57](https://arxiv.org/html/2405.14831v3#bib.bib57), [43](https://arxiv.org/html/2405.14831v3#bib.bib43), [47](https://arxiv.org/html/2405.14831v3#bib.bib47)\]. Although these works share HippoRAG’s use of graphs for multi-hop QA, their generation-based improvements are fully complementary to HippoRAG’s, which are solely based on improved retrieval.

Graph-Augmented Retrieval. In this second category, previous work trains a re-ranking module which can traverse a graph made using Wikipedia hyperlinks \[[16](https://arxiv.org/html/2405.14831v3#bib.bib16), [100](https://arxiv.org/html/2405.14831v3#bib.bib100), [54](https://arxiv.org/html/2405.14831v3#bib.bib54), [14](https://arxiv.org/html/2405.14831v3#bib.bib14), [4](https://arxiv.org/html/2405.14831v3#bib.bib4), [44](https://arxiv.org/html/2405.14831v3#bib.bib44)\]. HippoRAG, in contrast, builds a KG from scratch using LLMs and performs multi-hop retrieval without any supervision, making it much more adaptable.

### 6.3 LLMs & KGs

Combining the strengths of language models and knowledge graphs has been an active research direction for many years, both for augmenting LLMs with a KG in different ways \[[48](https://arxiv.org/html/2405.14831v3#bib.bib48), [80](https://arxiv.org/html/2405.14831v3#bib.bib80), [84](https://arxiv.org/html/2405.14831v3#bib.bib84)\] or augmenting KGs by either distilling knowledge from an LLM’s parametric knowledge \[[7](https://arxiv.org/html/2405.14831v3#bib.bib7), [85](https://arxiv.org/html/2405.14831v3#bib.bib85)\] or using them to parse text directly \[[8](https://arxiv.org/html/2405.14831v3#bib.bib8), [29](https://arxiv.org/html/2405.14831v3#bib.bib29), [94](https://arxiv.org/html/2405.14831v3#bib.bib94)\]. In an exceptionally comprehensive survey, Pan et al. \[[56](https://arxiv.org/html/2405.14831v3#bib.bib56)\] present a roadmap for this research direction and highlight the importance of work which synergizes these two important technologies \[[37](https://arxiv.org/html/2405.14831v3#bib.bib37), [74](https://arxiv.org/html/2405.14831v3#bib.bib74), [27](https://arxiv.org/html/2405.14831v3#bib.bib27), [91](https://arxiv.org/html/2405.14831v3#bib.bib91), [99](https://arxiv.org/html/2405.14831v3#bib.bib99)\]. Like these works, HippoRAG shows the potential for synergy between these two technologies, combining the knowledge graph construction abilities of LLMs with the retrieval advantages of structured knowledge for more effective RAG.

## 7 Conclusions & Limitations

Our proposed neurobiologically principled methodology, although simple, already shows promise for overcoming the inherent limitations of standard RAG systems while retaining their advantages over parametric memory. HippoRAG’s knowledge integration capabilities, demonstrated by its strong results on path-following multi-hop QA and promise on path-finding multi-hop QA, as well as its dramatic efficiency improvements and continuously updating nature, makes it a powerful middle-ground framework between standard RAG methods and parametric memory and offers a compelling solution for long-term memory in LLMs.

Nevertheless, several limitations can be addressed in future work to enable HippoRAG to achieve this goal better. First, we note that all components of HippoRAG are currently used off-the-shelf without any extra training. There is therefore much room to improve our method’s practical viability by performing specific component fine-tuning. This is evident in the error analysis discussed in Appendix [F](https://arxiv.org/html/2405.14831v3#A6 "Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), which shows most errors made by our system are due to NER and OpenIE and thus could benefit from direct fine-tuning. Given that the rest of the errors are graph search errors, also in Appendix [F](https://arxiv.org/html/2405.14831v3#A6 "Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), we note that several avenues for improvements over simple PPR exist, such as allowing relations to guide graph traversal directly. Additionally, as shown in Appendix [F.4](https://arxiv.org/html/2405.14831v3#A6.SS4 "F.4 OpenIE Document Length Analysis ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), more work must be done to improve the consistency of OpenIE in longer compared to shorter documents. Finally, and perhaps most importantly, HippoRAG’s scalability still calls for further validation. Although we show that Llama-3.1 could obtain similar performance to closed-source models and thus reduce costs considerably, we are yet to empirically prove the efficiency and efficacy of our synthetic hippocampal index as its size grows way beyond current benchmarks.

## Acknowledgments

The authors would like to thank colleagues from the OSU NLP group and Percy Liang for their thoughtful comments. This research was supported in part by NSF OAC 2112606, NIH R01LM014199, ARL W911NF2220144, and Cisco. The views and conclusions contained herein are those of the authors and should not be interpreted as representing the official policies, either expressed or implied, of the U.S. government. The U.S. Government is authorized to reproduce and distribute reprints for Government purposes notwithstanding any copyright notice herein.

## References

* AI@Meta [2024] AI@Meta. Llama 3 model card. 2024. URL https://github.com/meta-llama/llama3/blob/main/MODEL_CARD.md .
* AlKhamissi et&nbsp;al. [2022] B.&nbsp;AlKhamissi, M.&nbsp;Li, A.&nbsp;Celikyilmaz, M.&nbsp;T. Diab, and M.&nbsp;Ghazvininejad. A review on language models as knowledge bases. ArXiv , abs/2204.06031, 2022. URL https://arxiv.org/abs/2204.06031 .
* Angeli et&nbsp;al. [2015] G.&nbsp;Angeli, M.&nbsp;J. Johnson&nbsp;Premkumar, and C.&nbsp;D. Manning. Leveraging linguistic structure for open domain information extraction. In C.&nbsp;Zong and M.&nbsp;Strube, editors, Proceedings of the 53rd Annual Meeting of the Association for Computational Linguistics and the 7th International Joint Conference on Natural Language Processing (Volume 1: Long Papers) , pages 344–354, Beijing, China, July 2015. Association for Computational Linguistics. doi: 10.3115/v1/P15-1034. URL https://aclanthology.org/P15-1034 .
* Asai et&nbsp;al. [2020] A.&nbsp;Asai, K.&nbsp;Hashimoto, H.&nbsp;Hajishirzi, R.&nbsp;Socher, and C.&nbsp;Xiong. Learning to retrieve reasoning paths over wikipedia graph for question answering. In International Conference on Learning Representations , 2020. URL https://openreview.net/forum?id=SJgVHkrYDH .
* Banko et&nbsp;al. [2007] M.&nbsp;Banko, M.&nbsp;J. Cafarella, S.&nbsp;Soderland, M.&nbsp;Broadhead, and O.&nbsp;Etzioni. Open information extraction from the web. In Proceedings of the 20th International Joint Conference on Artifical Intelligence , IJCAI’07, page 2670–2676, San Francisco, CA, USA, 2007. Morgan Kaufmann Publishers Inc.
* Bhardwaj et&nbsp;al. [2019] S.&nbsp;Bhardwaj, S.&nbsp;Aggarwal, and Mausam. CaRB: A crowdsourced benchmark for open IE. In K.&nbsp;Inui, J.&nbsp;Jiang, V.&nbsp;Ng, and X.&nbsp;Wan, editors, Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing and the 9th International Joint Conference on Natural Language Processing (EMNLP-IJCNLP) , pages 6262–6267, Hong Kong, China, Nov. 2019. Association for Computational Linguistics. doi: 10.18653/v1/D19-1651. URL https://aclanthology.org/D19-1651 .
* Bosselut et&nbsp;al. [2019] A.&nbsp;Bosselut, H.&nbsp;Rashkin, M.&nbsp;Sap, C.&nbsp;Malaviya, A.&nbsp;Celikyilmaz, and Y.&nbsp;Choi. COMET: Commonsense transformers for automatic knowledge graph construction. In A.&nbsp;Korhonen, D.&nbsp;Traum, and L.&nbsp;Màrquez, editors, Proceedings of the 57th Annual Meeting of the Association for Computational Linguistics , pages 4762–4779, Florence, Italy, July 2019. Association for Computational Linguistics. doi: 10.18653/v1/P19-1470. URL https://aclanthology.org/P19-1470 .
* Chen and Bertozzi [2023] B.&nbsp;Chen and A.&nbsp;L. Bertozzi. AutoKG: Efficient Automated Knowledge Graph Generation for Language Models. In 2023 IEEE International Conference on Big Data (BigData) , pages 3117–3126, Los Alamitos, CA, USA, dec 2023. IEEE Computer Society. doi: 10.1109/BigData59044.2023.10386454. URL https://doi.ieeecomputersociety.org/10.1109/BigData59044.2023.10386454 .
* Chen et&nbsp;al. [2023a] H.&nbsp;Chen, R.&nbsp;Pasunuru, J.&nbsp;Weston, and A.&nbsp;Celikyilmaz. Walking Down the Memory Maze: Beyond Context Limit through Interactive Reading. CoRR , abs/2310.05029, 2023a. doi: 10.48550/ARXIV.2310.05029. URL https://doi.org/10.48550/arXiv.2310.05029 .
* Chen et&nbsp;al. [2023b] T.&nbsp;Chen, H.&nbsp;Wang, S.&nbsp;Chen, W.&nbsp;Yu, K.&nbsp;Ma, X.&nbsp;Zhao, H.&nbsp;Zhang, and D.&nbsp;Yu. Dense x retrieval: What retrieval granularity should we use? arXiv preprint arXiv:2312.06648 , 2023b. URL https://arxiv.org/abs/2312.06648 .
* Chen et&nbsp;al. [2023c] Y.&nbsp;Chen, S.&nbsp;Qian, H.&nbsp;Tang, X.&nbsp;Lai, Z.&nbsp;Liu, S.&nbsp;Han, and J.&nbsp;Jia. Longlora: Efficient fine-tuning of long-context large language models. arXiv:2309.12307 , 2023c.
* Chen et&nbsp;al. [2024] Y.&nbsp;Chen, P.&nbsp;Cao, Y.&nbsp;Chen, K.&nbsp;Liu, and J.&nbsp;Zhao. Journey to the center of the knowledge neurons: Discoveries of language-independent knowledge neurons and degenerate knowledge neurons. Proceedings of the AAAI Conference on Artificial Intelligence , 38(16):17817–17825, Mar. 2024. doi: 10.1609/aaai.v38i16.29735. URL https://ojs.aaai.org/index.php/AAAI/article/view/29735 .
* Csárdi and Nepusz [2006] G.&nbsp;Csárdi and T.&nbsp;Nepusz. The igraph software package for complex network research. 2006. URL https://igraph.org/ .
* Das et&nbsp;al. [2019] R.&nbsp;Das, A.&nbsp;Godbole, D.&nbsp;Kavarthapu, Z.&nbsp;Gong, A.&nbsp;Singhal, M.&nbsp;Yu, X.&nbsp;Guo, T.&nbsp;Gao, H.&nbsp;Zamani, M.&nbsp;Zaheer, and A.&nbsp;McCallum. Multi-step entity-centric information retrieval for multi-hop question answering. In A.&nbsp;Fisch, A.&nbsp;Talmor, R.&nbsp;Jia, M.&nbsp;Seo, E.&nbsp;Choi, and D.&nbsp;Chen, editors, Proceedings of the 2nd Workshop on Machine Reading for Question Answering , pages 113–118, Hong Kong, China, Nov. 2019. Association for Computational Linguistics. doi: 10.18653/v1/D19-5816. URL https://aclanthology.org/D19-5816 .
* De&nbsp;Cao et&nbsp;al. [2021] N.&nbsp;De&nbsp;Cao, W.&nbsp;Aziz, and I.&nbsp;Titov. Editing factual knowledge in language models. In M.-F. Moens, X.&nbsp;Huang, L.&nbsp;Specia, and S.&nbsp;W.-t. Yih, editors, Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing , pages 6491–6506, Online and Punta Cana, Dominican Republic, Nov. 2021. Association for Computational Linguistics. doi: 10.18653/v1/2021.emnlp-main.522. URL https://aclanthology.org/2021.emnlp-main.522 .
* Ding et&nbsp;al. [2019] M.&nbsp;Ding, C.&nbsp;Zhou, Q.&nbsp;Chen, H.&nbsp;Yang, and J.&nbsp;Tang. Cognitive graph for multi-hop reading comprehension at scale. In A.&nbsp;Korhonen, D.&nbsp;Traum, and L.&nbsp;Màrquez, editors, Proceedings of the 57th Annual Meeting of the Association for Computational Linguistics , pages 2694–2703, Florence, Italy, July 2019. Association for Computational Linguistics. doi: 10.18653/v1/P19-1259. URL https://aclanthology.org/P19-1259 .
* Ding et&nbsp;al. [2024] Y.&nbsp;Ding, L.&nbsp;L. Zhang, C.&nbsp;Zhang, Y.&nbsp;Xu, N.&nbsp;Shang, J.&nbsp;Xu, F.&nbsp;Yang, and M.&nbsp;Yang. Longrope: Extending llm context window beyond 2 million tokens. ArXiv , abs/2402.13753, 2024. URL https://api.semanticscholar.org/CorpusID:267770308 .
* Edge et&nbsp;al. [2024] D.&nbsp;Edge, H.&nbsp;Trinh, N.&nbsp;Cheng, J.&nbsp;Bradley, A.&nbsp;Chao, A.&nbsp;Mody, S.&nbsp;Truitt, and J.&nbsp;Larson. From local to global: A graph rag approach to query-focused summarization. 2024. URL https://arxiv.org/abs/2404.16130 .
* Eichenbaum [2000] H.&nbsp;Eichenbaum. A cortical–hippocampal system for declarative memory. Nature Reviews Neuroscience , 1:41–50, 2000. URL https://www.nature.com/articles/35036213 .
* Fang et&nbsp;al. [2020] Y.&nbsp;Fang, S.&nbsp;Sun, Z.&nbsp;Gan, R.&nbsp;Pillai, S.&nbsp;Wang, and J.&nbsp;Liu. Hierarchical graph network for multi-hop question answering. In B.&nbsp;Webber, T.&nbsp;Cohn, Y.&nbsp;He, and Y.&nbsp;Liu, editors, Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing (EMNLP) , pages 8823–8838, Online, Nov. 2020. Association for Computational Linguistics. doi: 10.18653/v1/2020.emnlp-main.710. URL https://aclanthology.org/2020.emnlp-main.710 .
* Fu [2024] Y.&nbsp;Fu. Challenges in deploying long-context transformers: A theoretical peak performance analysis, 2024. URL https://arxiv.org/abs/2405.08944 .
* Fu et&nbsp;al. [2024] Y.&nbsp;Fu, R.&nbsp;Panda, X.&nbsp;Niu, X.&nbsp;Yue, H.&nbsp;Hajishirzi, Y.&nbsp;Kim, and H.&nbsp;Peng. Data engineering for scaling language models to 128k context, 2024.
* Geva et&nbsp;al. [2023] M.&nbsp;Geva, J.&nbsp;Bastings, K.&nbsp;Filippova, and A.&nbsp;Globerson. Dissecting recall of factual associations in auto-regressive language models. In H.&nbsp;Bouamor, J.&nbsp;Pino, and K.&nbsp;Bali, editors, Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing, EMNLP 2023, Singapore, December 6-10, 2023 , pages 12216–12235. Association for Computational Linguistics, 2023. doi: 10.18653/V1/2023.EMNLP-MAIN.751. URL https://doi.org/10.18653/v1/2023.emnlp-main.751 .
* Gormley and Tong [2015] C.&nbsp;Gormley and Z.&nbsp;J. Tong. Elasticsearch: The definitive guide. 2015. URL https://www.elastic.co/guide/en/elasticsearch/guide/master/index.html .
* Griffiths et&nbsp;al. [2007] T.&nbsp;L. Griffiths, M.&nbsp;Steyvers, and A.&nbsp;J. Firl. Google and the mind. Psychological Science , 18:1069 – 1076, 2007. URL https://cocosci.princeton.edu/tom/papers/google.pdf .
* Gu et&nbsp;al. [2024] J.-C. Gu, H.-X. Xu, J.-Y. Ma, P.&nbsp;Lu, Z.-H. Ling, K.-W. Chang, and N.&nbsp;Peng. Model Editing Can Hurt General Abilities of Large Language Models, 2024.
* Gu et&nbsp;al. [2023] Y.&nbsp;Gu, X.&nbsp;Deng, and Y.&nbsp;Su. Don’t generate, discriminate: A proposal for grounding language models to real-world environments. In A.&nbsp;Rogers, J.&nbsp;Boyd-Graber, and N.&nbsp;Okazaki, editors, Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers) , pages 4928–4949, Toronto, Canada, July 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.acl-long.270. URL https://aclanthology.org/2023.acl-long.270 .
* Gurnee and Tegmark [2024] W.&nbsp;Gurnee and M.&nbsp;Tegmark. Language models represent space and time. In The Twelfth International Conference on Learning Representations , 2024. URL https://openreview.net/forum?id=jE8xbmvFin .
* Han et&nbsp;al. [2023] J.&nbsp;Han, N.&nbsp;Collier, W.&nbsp;Buntine, and E.&nbsp;Shareghi. PiVe: Prompting with Iterative Verification Improving Graph-based Generative Capability of LLMs, 2023.
* Haveliwala [2002] T.&nbsp;H. Haveliwala. Topic-sensitive pagerank. In D.&nbsp;Lassner, D.&nbsp;D. Roure, and A.&nbsp;Iyengar, editors, Proceedings of the Eleventh International World Wide Web Conference, WWW 2002, May 7-11, 2002, Honolulu, Hawaii, USA , pages 517–526. ACM, 2002. doi: 10.1145/511446.511513. URL https://dl.acm.org/doi/10.1145/511446.511513 .
* He et&nbsp;al. [2024a] Q.&nbsp;He, Y.&nbsp;Wang, and W.&nbsp;Wang. Can language models act as knowledge bases at scale?, 2024a.
* He et&nbsp;al. [2024b] Z.&nbsp;He, L.&nbsp;Karlinsky, D.&nbsp;Kim, J.&nbsp;McAuley, D.&nbsp;Krotov, and R.&nbsp;Feris. CAMELot: Towards large language models with training-free consolidated associative memory. In First Workshop on Long-Context Foundation Models @ ICML 2024 , 2024b. URL https://openreview.net/forum?id=VLDTzg1a4Y .
* Ho et&nbsp;al. [2020] X.&nbsp;Ho, A.-K. Duong&nbsp;Nguyen, S.&nbsp;Sugawara, and A.&nbsp;Aizawa. Constructing a multi-hop QA dataset for comprehensive evaluation of reasoning steps. In D.&nbsp;Scott, N.&nbsp;Bel, and C.&nbsp;Zong, editors, Proceedings of the 28th International Conference on Computational Linguistics , pages 6609–6625, Barcelona, Spain (Online), Dec. 2020. International Committee on Computational Linguistics. doi: 10.18653/v1/2020.coling-main.580. URL https://aclanthology.org/2020.coling-main.580 .
* Huguet&nbsp;Cabot and Navigli [2021] P.-L. Huguet&nbsp;Cabot and R.&nbsp;Navigli. REBEL: Relation extraction by end-to-end language generation. In M.-F. Moens, X.&nbsp;Huang, L.&nbsp;Specia, and S.&nbsp;W.-t. Yih, editors, Findings of the Association for Computational Linguistics: EMNLP 2021 , pages 2370–2381, Punta Cana, Dominican Republic, Nov. 2021. Association for Computational Linguistics. doi: 10.18653/v1/2021.findings-emnlp.204. URL https://aclanthology.org/2021.findings-emnlp.204 .
* Izacard et&nbsp;al. [2021] G.&nbsp;Izacard, M.&nbsp;Caron, L.&nbsp;Hosseini, S.&nbsp;Riedel, P.&nbsp;Bojanowski, A.&nbsp;Joulin, and E.&nbsp;Grave. Unsupervised dense information retrieval with contrastive learning, 2021. URL https://arxiv.org/abs/2112.09118 .
* Izacard et&nbsp;al. [2022] G.&nbsp;Izacard, P.&nbsp;Lewis, M.&nbsp;Lomeli, L.&nbsp;Hosseini, F.&nbsp;Petroni, T.&nbsp;Schick, J.&nbsp;A. Yu, A.&nbsp;Joulin, S.&nbsp;Riedel, and E.&nbsp;Grave. Few-shot learning with retrieval augmented language models. ArXiv , abs/2208.03299, 2022. URL https://arxiv.org/abs/2208.03299 .
* Jiang et&nbsp;al. [2023a] J.&nbsp;Jiang, K.&nbsp;Zhou, Z.&nbsp;Dong, K.&nbsp;Ye, X.&nbsp;Zhao, and J.-R. Wen. StructGPT: A general framework for large language model to reason over structured data. In H.&nbsp;Bouamor, J.&nbsp;Pino, and K.&nbsp;Bali, editors, Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing , pages 9237–9251, Singapore, Dec. 2023a. Association for Computational Linguistics. doi: 10.18653/v1/2023.emnlp-main.574. URL https://aclanthology.org/2023.emnlp-main.574 .
* Jiang et&nbsp;al. [2023b] Z.&nbsp;Jiang, F.&nbsp;Xu, L.&nbsp;Gao, Z.&nbsp;Sun, Q.&nbsp;Liu, J.&nbsp;Dwivedi-Yu, Y.&nbsp;Yang, J.&nbsp;Callan, and G.&nbsp;Neubig. Active retrieval augmented generation. In H.&nbsp;Bouamor, J.&nbsp;Pino, and K.&nbsp;Bali, editors, Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing , pages 7969–7992, Singapore, Dec. 2023b. Association for Computational Linguistics. doi: 10.18653/v1/2023.emnlp-main.495. URL https://aclanthology.org/2023.emnlp-main.495 .
* Kambhampati [2024] S.&nbsp;Kambhampati. Can large language models reason and plan? Annals of the New York Academy of Sciences , 2024. URL https://nyaspubs.onlinelibrary.wiley.com/doi/abs/10.1111/nyas.15125 .
* Kwon et&nbsp;al. [2023] W.&nbsp;Kwon, Z.&nbsp;Li, S.&nbsp;Zhuang, Y.&nbsp;Sheng, L.&nbsp;Zheng, C.&nbsp;H. Yu, J.&nbsp;E. Gonzalez, H.&nbsp;Zhang, and I.&nbsp;Stoica. Efficient memory management for large language model serving with pagedattention. In Proceedings of the ACM SIGOPS 29th Symposium on Operating Systems Principles , 2023.
* Levy et&nbsp;al. [2024] M.&nbsp;Levy, A.&nbsp;Jacoby, and Y.&nbsp;Goldberg. Same task, more tokens: the impact of input length on the reasoning performance of large language models, 2024.
* Lewis et&nbsp;al. [2020] P.&nbsp;Lewis, E.&nbsp;Perez, A.&nbsp;Piktus, F.&nbsp;Petroni, V.&nbsp;Karpukhin, N.&nbsp;Goyal, H.&nbsp;Küttler, M.&nbsp;Lewis, W.-t. Yih, T.&nbsp;Rocktäschel, S.&nbsp;Riedel, and D.&nbsp;Kiela. Retrieval-augmented generation for knowledge-intensive NLP tasks. In Proceedings of the 34th International Conference on Neural Information Processing Systems , NIPS ’20, Red Hook, NY, USA, 2020. Curran Associates Inc. ISBN 9781713829546. URL https://dl.acm.org/doi/abs/10.5555/3495724.3496517 .
* Li and Du [2023] R.&nbsp;Li and X.&nbsp;Du. Leveraging structured information for explainable multi-hop question answering and reasoning. In H.&nbsp;Bouamor, J.&nbsp;Pino, and K.&nbsp;Bali, editors, Findings of the Association for Computational Linguistics: EMNLP 2023 , pages 6779–6789, Singapore, Dec. 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.findings-emnlp.452. URL https://aclanthology.org/2023.findings-emnlp.452 .
* Li et&nbsp;al. [2021] S.&nbsp;Li, X.&nbsp;Li, L.&nbsp;Shang, X.&nbsp;Jiang, Q.&nbsp;Liu, C.&nbsp;Sun, Z.&nbsp;Ji, and B.&nbsp;Liu. Hopretriever: Retrieve hops over wikipedia to answer complex questions. Proceedings of the AAAI Conference on Artificial Intelligence , 35:13279–13287, 05 2021. doi: 10.1609/aaai.v35i15.17568.
* Li et&nbsp;al. [2024a] T.&nbsp;Li, G.&nbsp;Zhang, Q.&nbsp;D. Do, X.&nbsp;Yue, and W.&nbsp;Chen. Long-context LLMs Struggle with Long In-context Learning, 2024a.
* Li et&nbsp;al. [2024b] Z.&nbsp;Li, N.&nbsp;Zhang, Y.&nbsp;Yao, M.&nbsp;Wang, X.&nbsp;Chen, and H.&nbsp;Chen. Unveiling the pitfalls of knowledge editing for large language models. In The Twelfth International Conference on Learning Representations , 2024b. URL https://openreview.net/forum?id=fNktD3ib16 .
* Liu et&nbsp;al. [2024] Y.&nbsp;Liu, X.&nbsp;Peng, T.&nbsp;Du, J.&nbsp;Yin, W.&nbsp;Liu, and X.&nbsp;Zhang. ERA-CoT: Improving chain-of-thought through entity relationship analysis. In L.-W. Ku, A.&nbsp;Martins, and V.&nbsp;Srikumar, editors, Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers) , pages 8780–8794, Bangkok, Thailand, Aug. 2024. Association for Computational Linguistics. doi: 10.18653/v1/2024.acl-long.476. URL https://aclanthology.org/2024.acl-long.476 .
* LUO et&nbsp;al. [2024] L.&nbsp;LUO, Y.-F. Li, R.&nbsp;Haf, and S.&nbsp;Pan. Reasoning on graphs: Faithful and interpretable large language model reasoning. In The Twelfth International Conference on Learning Representations , 2024. URL https://openreview.net/forum?id=ZGNWW7xZ6Q .
* Meng et&nbsp;al. [2022] K.&nbsp;Meng, D.&nbsp;Bau, A.&nbsp;Andonian, and Y.&nbsp;Belinkov. Locating and editing factual associations in gpt. In Neural Information Processing Systems , 2022.
* Mitchell et&nbsp;al. [2021] E.&nbsp;Mitchell, C.&nbsp;Lin, A.&nbsp;Bosselut, C.&nbsp;Finn, and C.&nbsp;D. Manning. Fast model editing at scale. ArXiv , abs/2110.11309, 2021.
* Mitchell et&nbsp;al. [2022] E.&nbsp;Mitchell, C.&nbsp;Lin, A.&nbsp;Bosselut, C.&nbsp;D. Manning, and C.&nbsp;Finn. Memory-based model editing at scale. ArXiv , abs/2206.06520, 2022.
* Nguyen et&nbsp;al. [2022] T.&nbsp;T. Nguyen, T.&nbsp;T. Huynh, P.&nbsp;L. Nguyen, A.&nbsp;W.-C. Liew, H.&nbsp;Yin, and Q.&nbsp;V.&nbsp;H. Nguyen. A survey of machine unlearning. arXiv preprint arXiv:2209.02299 , 2022.
* Ni et&nbsp;al. [2022] J.&nbsp;Ni, C.&nbsp;Qu, J.&nbsp;Lu, Z.&nbsp;Dai, G.&nbsp;Hernandez&nbsp;Abrego, J.&nbsp;Ma, V.&nbsp;Zhao, Y.&nbsp;Luan, K.&nbsp;Hall, M.-W. Chang, and Y.&nbsp;Yang. Large dual encoders are generalizable retrievers. In Y.&nbsp;Goldberg, Z.&nbsp;Kozareva, and Y.&nbsp;Zhang, editors, Proceedings of the 2022 Conference on Empirical Methods in Natural Language Processing , pages 9844–9855, Abu Dhabi, United Arab Emirates, Dec. 2022. Association for Computational Linguistics. doi: 10.18653/v1/2022.emnlp-main.669. URL https://aclanthology.org/2022.emnlp-main.669 .
* Nie et&nbsp;al. [2019] Y.&nbsp;Nie, S.&nbsp;Wang, and M.&nbsp;Bansal. Revealing the importance of semantic retrieval for machine reading at scale. In K.&nbsp;Inui, J.&nbsp;Jiang, V.&nbsp;Ng, and X.&nbsp;Wan, editors, Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing and the 9th International Joint Conference on Natural Language Processing (EMNLP-IJCNLP) , pages 2553–2566, Hong Kong, China, Nov. 2019. Association for Computational Linguistics. doi: 10.18653/v1/D19-1258. URL https://aclanthology.org/D19-1258 .
* OpenAI [2024] OpenAI. GPT-3.5 Turbo, 2024. URL https://platform.openai.com/docs/models/gpt-3-5-turbo .
* Pan et&nbsp;al. [2024] S.&nbsp;Pan, L.&nbsp;Luo, Y.&nbsp;Wang, C.&nbsp;Chen, J.&nbsp;Wang, and X.&nbsp;Wu. Unifying large language models and knowledge graphs: A roadmap. IEEE Transactions on Knowledge and Data Engineering , pages 1–20, 2024. doi: 10.1109/TKDE.2024.3352100.
* Park et&nbsp;al. [2024] J.&nbsp;Park, A.&nbsp;Patel, O.&nbsp;Z. Khan, H.&nbsp;J. Kim, and J.-K. Kim. Graph elicitation for guiding multi-step reasoning in large language models, 2024. URL https://arxiv.org/abs/2311.09762 .
* Park and Bak [2024] S.&nbsp;Park and J.&nbsp;Bak. Memoria: Resolving fateful forgetting problem through human-inspired memory architecture. In ICML , 2024. URL https://openreview.net/forum?id=yTz0u4B8ug .
* Paszke et&nbsp;al. [2019] A.&nbsp;Paszke, S.&nbsp;Gross, F.&nbsp;Massa, A.&nbsp;Lerer, J.&nbsp;Bradbury, G.&nbsp;Chanan, T.&nbsp;Killeen, Z.&nbsp;Lin, N.&nbsp;Gimelshein, L.&nbsp;Antiga, A.&nbsp;Desmaison, A.&nbsp;Köpf, E.&nbsp;Z. Yang, Z.&nbsp;DeVito, M.&nbsp;Raison, A.&nbsp;Tejani, S.&nbsp;Chilamkurthy, B.&nbsp;Steiner, L.&nbsp;Fang, J.&nbsp;Bai, and S.&nbsp;Chintala. Pytorch: An imperative style, high-performance deep learning library. In H.&nbsp;M. Wallach, H.&nbsp;Larochelle, A.&nbsp;Beygelzimer, F.&nbsp;d’Alché-Buc, E.&nbsp;B. Fox, and R.&nbsp;Garnett, editors, Advances in Neural Information Processing Systems 32: Annual Conference on Neural Information Processing Systems 2019, NeurIPS 2019, December 8-14, 2019, Vancouver, BC, Canada , pages 8024–8035, 2019. URL https://dl.acm.org/doi/10.5555/3454287.3455008 .
* Pei et&nbsp;al. [2023] K.&nbsp;Pei, I.&nbsp;Jindal, K.&nbsp;C.-C. Chang, C.&nbsp;Zhai, and Y.&nbsp;Li. When to use what: An in-depth comparative empirical analysis of OpenIE systems for downstream applications. In A.&nbsp;Rogers, J.&nbsp;Boyd-Graber, and N.&nbsp;Okazaki, editors, Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers) , pages 929–949, Toronto, Canada, July 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.acl-long.53. URL https://aclanthology.org/2023.acl-long.53 .
* Peng et&nbsp;al. [2023] B.&nbsp;Peng, J.&nbsp;Quesnelle, H.&nbsp;Fan, and E.&nbsp;Shippole. Yarn: Efficient context window extension of large language models, 2023.
* Petroni et&nbsp;al. [2019] F.&nbsp;Petroni, T.&nbsp;Rocktäschel, S.&nbsp;Riedel, P.&nbsp;Lewis, A.&nbsp;Bakhtin, Y.&nbsp;Wu, and A.&nbsp;Miller. Language models as knowledge bases? In K.&nbsp;Inui, J.&nbsp;Jiang, V.&nbsp;Ng, and X.&nbsp;Wan, editors, Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing and the 9th International Joint Conference on Natural Language Processing (EMNLP-IJCNLP) , pages 2463–2473, Hong Kong, China, Nov. 2019. Association for Computational Linguistics. doi: 10.18653/v1/D19-1250. URL https://aclanthology.org/D19-1250 .
* Press et&nbsp;al. [2023a] O.&nbsp;Press, M.&nbsp;Zhang, S.&nbsp;Min, L.&nbsp;Schmidt, N.&nbsp;Smith, and M.&nbsp;Lewis. Measuring and narrowing the compositionality gap in language models. In H.&nbsp;Bouamor, J.&nbsp;Pino, and K.&nbsp;Bali, editors, Findings of the Association for Computational Linguistics: EMNLP 2023 , pages 5687–5711, Singapore, Dec. 2023a. Association for Computational Linguistics. doi: 10.18653/v1/2023.findings-emnlp.378. URL https://aclanthology.org/2023.findings-emnlp.378 .
* Press et&nbsp;al. [2023b] O.&nbsp;Press, M.&nbsp;Zhang, S.&nbsp;Min, L.&nbsp;Schmidt, N.&nbsp;A. Smith, and M.&nbsp;Lewis. Measuring and narrowing the compositionality gap in language models, 2023b. URL https://openreview.net/forum?id=PUwbwZJz9dO .
* Qiu et&nbsp;al. [2019] L.&nbsp;Qiu, Y.&nbsp;Xiao, Y.&nbsp;Qu, H.&nbsp;Zhou, L.&nbsp;Li, W.&nbsp;Zhang, and Y.&nbsp;Yu. Dynamically fused graph network for multi-hop reasoning. In A.&nbsp;Korhonen, D.&nbsp;Traum, and L.&nbsp;Màrquez, editors, Proceedings of the 57th Annual Meeting of the Association for Computational Linguistics , pages 6140–6150, Florence, Italy, July 2019. Association for Computational Linguistics. doi: 10.18653/v1/P19-1617. URL https://aclanthology.org/P19-1617 .
* Ram et&nbsp;al. [2023] O.&nbsp;Ram, Y.&nbsp;Levine, I.&nbsp;Dalmedigos, D.&nbsp;Muhlgay, A.&nbsp;Shashua, K.&nbsp;Leyton-Brown, and Y.&nbsp;Shoham. In-context retrieval-augmented language models. Transactions of the Association for Computational Linguistics , 11:1316–1331, 2023. doi: 10.1162/tacl_a_00605. URL https://aclanthology.org/2023.tacl-1.75 .
* Ramesh et&nbsp;al. [2023] G.&nbsp;Ramesh, M.&nbsp;N. Sreedhar, and J.&nbsp;Hu. Single sequence prediction over reasoning graphs for multi-hop QA. In A.&nbsp;Rogers, J.&nbsp;Boyd-Graber, and N.&nbsp;Okazaki, editors, Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers) , pages 11466–11481, Toronto, Canada, July 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.acl-long.642. URL https://aclanthology.org/2023.acl-long.642 .
* Reid et&nbsp;al. [2024] M.&nbsp;Reid, N.&nbsp;Savinov, D.&nbsp;Teplyashin, D.&nbsp;Lepikhin, T.&nbsp;Lillicrap, J.-b. Alayrac, R.&nbsp;Soricut, A.&nbsp;Lazaridou, O.&nbsp;Firat, J.&nbsp;Schrittwieser, et&nbsp;al. Gemini 1.5: Unlocking multimodal understanding across millions of tokens of context. arXiv preprint arXiv:2403.05530 , 2024. URL https://arxiv.org/abs/2403.05530 .
* Robertson and Walker [1994] S.&nbsp;E. Robertson and S.&nbsp;Walker. Some simple effective approximations to the 2-poisson model for probabilistic weighted retrieval. In W.&nbsp;B. Croft and C.&nbsp;J. van Rijsbergen, editors, Proceedings of the 17th Annual International ACM-SIGIR Conference on Research and Development in Information Retrieval. Dublin, Ireland, 3-6 July 1994 (Special Issue of the SIGIR Forum) , pages 232–241. ACM/Springer, 1994. doi: 10.1007/978-1-4471-2099-5\_24. URL https://link.springer.com/chapter/10.1007/978-1-4471-2099-5_24 .
* Santhanam et&nbsp;al. [2022] K.&nbsp;Santhanam, O.&nbsp;Khattab, J.&nbsp;Saad-Falcon, C.&nbsp;Potts, and M.&nbsp;Zaharia. ColBERTv2: Effective and efficient retrieval via lightweight late interaction. In M.&nbsp;Carpuat, M.-C. de&nbsp;Marneffe, and I.&nbsp;V. Meza&nbsp;Ruiz, editors, Proceedings of the 2022 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies , pages 3715–3734, Seattle, United States, July 2022. Association for Computational Linguistics. doi: 10.18653/v1/2022.naacl-main.272. URL https://aclanthology.org/2022.naacl-main.272 .
* Sarthi et&nbsp;al. [2024] P.&nbsp;Sarthi, S.&nbsp;Abdullah, A.&nbsp;Tuli, S.&nbsp;Khanna, A.&nbsp;Goldie, and C.&nbsp;D. Manning. RAPTOR: recursive abstractive processing for tree-organized retrieval. CoRR , abs/2401.18059, 2024. doi: 10.48550/ARXIV.2401.18059. URL https://arxiv.org/abs/2401.18059 .
* Shao et&nbsp;al. [2023] Z.&nbsp;Shao, Y.&nbsp;Gong, Y.&nbsp;Shen, M.&nbsp;Huang, N.&nbsp;Duan, and W.&nbsp;Chen. Enhancing retrieval-augmented large language models with iterative retrieval-generation synergy. In H.&nbsp;Bouamor, J.&nbsp;Pino, and K.&nbsp;Bali, editors, Findings of the Association for Computational Linguistics: EMNLP 2023 , pages 9248–9274, Singapore, Dec. 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.findings-emnlp.620. URL https://aclanthology.org/2023.findings-emnlp.620 .
* Shi et&nbsp;al. [2023] W.&nbsp;Shi, S.&nbsp;Min, M.&nbsp;Yasunaga, M.&nbsp;Seo, R.&nbsp;James, M.&nbsp;Lewis, L.&nbsp;Zettlemoyer, and W.&nbsp;tau Yih. Replug: Retrieval-augmented black-box language models. ArXiv , abs/2301.12652, 2023. URL https://api.semanticscholar.org/CorpusID:256389797 .
* Sun et&nbsp;al. [2024] J.&nbsp;Sun, C.&nbsp;Xu, L.&nbsp;Tang, S.&nbsp;Wang, C.&nbsp;Lin, Y.&nbsp;Gong, L.&nbsp;Ni, H.-Y. Shum, and J.&nbsp;Guo. Think-on-graph: Deep and responsible reasoning of large language model on knowledge graph. In The Twelfth International Conference on Learning Representations , 2024. URL https://openreview.net/forum?id=nnVO1PvbTv .
* Teyler and Discenna [1986] T.&nbsp;J. Teyler and P.&nbsp;Discenna. The hippocampal memory indexing theory. Behavioral neuroscience , 100 2:147–54, 1986. URL https://pubmed.ncbi.nlm.nih.gov/3008780/ .
* Teyler and Rudy [2007] T.&nbsp;J. Teyler and J.&nbsp;W. Rudy. The hippocampal indexing theory and episodic memory: Updating the index. Hippocampus , 17, 2007. URL https://pubmed.ncbi.nlm.nih.gov/17696170/ .
* Trivedi et&nbsp;al. [2022] H.&nbsp;Trivedi, N.&nbsp;Balasubramanian, T.&nbsp;Khot, and A.&nbsp;Sabharwal. MuSiQue: Multihop questions via single-hop question composition. Trans. Assoc. Comput. Linguistics , 10:539–554, 2022. doi: 10.1162/TACL\_A\_00475. URL https://aclanthology.org/2022.tacl-1.31/ .
* Trivedi et&nbsp;al. [2023] H.&nbsp;Trivedi, N.&nbsp;Balasubramanian, T.&nbsp;Khot, and A.&nbsp;Sabharwal. Interleaving retrieval with chain-of-thought reasoning for knowledge-intensive multi-step questions. In A.&nbsp;Rogers, J.&nbsp;Boyd-Graber, and N.&nbsp;Okazaki, editors, Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics (Volume 1: Long Papers) , pages 10014–10037, Toronto, Canada, July 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.acl-long.557. URL https://aclanthology.org/2023.acl-long.557 .
* Wang et&nbsp;al. [2023a] C.&nbsp;Wang, X.&nbsp;Liu, Y.&nbsp;Yue, X.&nbsp;Tang, T.&nbsp;Zhang, C.&nbsp;Jiayang, Y.&nbsp;Yao, W.&nbsp;Gao, X.&nbsp;Hu, Z.&nbsp;Qi, Y.&nbsp;Wang, L.&nbsp;Yang, J.&nbsp;Wang, X.&nbsp;Xie, Z.&nbsp;Zhang, and Y.&nbsp;Zhang. Survey on factuality in large language models: Knowledge, retrieval and domain-specificity, 2023a.
* Wang et&nbsp;al. [2023b] J.&nbsp;Wang, Q.&nbsp;Sun, N.&nbsp;Chen, X.&nbsp;Li, and M.&nbsp;Gao. Boosting language models reasoning with chain-of-knowledge prompting, 2023b.
* Wang et&nbsp;al. [2023c] X.&nbsp;Wang, J.&nbsp;Wei, D.&nbsp;Schuurmans, Q.&nbsp;V. Le, E.&nbsp;H. Chi, S.&nbsp;Narang, A.&nbsp;Chowdhery, and D.&nbsp;Zhou. Self-consistency improves chain of thought reasoning in language models. In The Eleventh International Conference on Learning Representations , 2023c. URL https://openreview.net/forum?id=1PL1NIMMrw .
* Wang et&nbsp;al. [2024] Y.&nbsp;Wang, Y.&nbsp;Gao, X.&nbsp;Chen, H.&nbsp;Jiang, S.&nbsp;Li, J.&nbsp;Yang, Q.&nbsp;Yin, Z.&nbsp;Li, X.&nbsp;Li, B.&nbsp;Yin, J.&nbsp;Shang, and J.&nbsp;Mcauley. MEMORYLLM: Towards self-updatable large language models. In R.&nbsp;Salakhutdinov, Z.&nbsp;Kolter, K.&nbsp;Heller, A.&nbsp;Weller, N.&nbsp;Oliver, J.&nbsp;Scarlett, and F.&nbsp;Berkenkamp, editors, Proceedings of the 41st International Conference on Machine Learning , volume 235 of Proceedings of Machine Learning Research , pages 50453–50466. PMLR, 21–27 Jul 2024. URL https://proceedings.mlr.press/v235/wang24s.html .
* Wei et&nbsp;al. [2022] J.&nbsp;Wei, X.&nbsp;Wang, D.&nbsp;Schuurmans, M.&nbsp;Bosma, brian ichter, F.&nbsp;Xia, E.&nbsp;H. Chi, Q.&nbsp;V. Le, and D.&nbsp;Zhou. Chain of thought prompting elicits reasoning in large language models. In A.&nbsp;H. Oh, A.&nbsp;Agarwal, D.&nbsp;Belgrave, and K.&nbsp;Cho, editors, Advances in Neural Information Processing Systems , 2022. URL https://openreview.net/forum?id=_VjQlMeSB_J .
* Wen et&nbsp;al. [2023] Y.&nbsp;Wen, Z.&nbsp;Wang, and J.&nbsp;Sun. Mindmap: Knowledge graph prompting sparks graph of thoughts in large language models. arXiv preprint arXiv:2308.09729 , 2023.
* West et&nbsp;al. [2022] P.&nbsp;West, C.&nbsp;Bhagavatula, J.&nbsp;Hessel, J.&nbsp;Hwang, L.&nbsp;Jiang, R.&nbsp;Le&nbsp;Bras, X.&nbsp;Lu, S.&nbsp;Welleck, and Y.&nbsp;Choi. Symbolic knowledge distillation: from general language models to commonsense models. In M.&nbsp;Carpuat, M.-C. de&nbsp;Marneffe, and I.&nbsp;V. Meza&nbsp;Ruiz, editors, Proceedings of the 2022 Conference of the North American Chapter of the Association for Computational Linguistics: Human Language Technologies , pages 4602–4625, Seattle, United States, July 2022. Association for Computational Linguistics. doi: 10.18653/v1/2022.naacl-main.341. URL https://aclanthology.org/2022.naacl-main.341 .
* Wolf et&nbsp;al. [2019] T.&nbsp;Wolf, L.&nbsp;Debut, V.&nbsp;Sanh, J.&nbsp;Chaumond, C.&nbsp;Delangue, A.&nbsp;Moi, P.&nbsp;Cistac, T.&nbsp;Rault, R.&nbsp;Louf, M.&nbsp;Funtowicz, J.&nbsp;Davison, S.&nbsp;Shleifer, P.&nbsp;von Platen, C.&nbsp;Ma, Y.&nbsp;Jernite, J.&nbsp;Plu, C.&nbsp;Xu, T.&nbsp;L. Scao, S.&nbsp;Gugger, M.&nbsp;Drame, Q.&nbsp;Lhoest, and A.&nbsp;M. Rush. Huggingface’s transformers: State-of-the-art natural language processing. ArXiv , abs/1910.03771, 2019. URL https://arxiv.org/abs/1910.03771 .
* Xie et&nbsp;al. [2024] J.&nbsp;Xie, K.&nbsp;Zhang, J.&nbsp;Chen, R.&nbsp;Lou, and Y.&nbsp;Su. Adaptive chameleon or stubborn sloth: Revealing the behavior of large language models in knowledge conflicts. In The Twelfth International Conference on Learning Representations , 2024. URL https://openreview.net/forum?id=auKAUJZMO6 .
* Xiong et&nbsp;al. [2021] W.&nbsp;Xiong, X.&nbsp;Li, S.&nbsp;Iyer, J.&nbsp;Du, P.&nbsp;Lewis, W.&nbsp;Y. Wang, Y.&nbsp;Mehdad, S.&nbsp;Yih, S.&nbsp;Riedel, D.&nbsp;Kiela, and B.&nbsp;Oguz. Answering complex open-domain questions with multi-hop dense retrieval. In International Conference on Learning Representations , 2021. URL https://openreview.net/forum?id=EMHoBG0avc1 .
* Yang et&nbsp;al. [2018] Z.&nbsp;Yang, P.&nbsp;Qi, S.&nbsp;Zhang, Y.&nbsp;Bengio, W.&nbsp;W. Cohen, R.&nbsp;Salakhutdinov, and C.&nbsp;D. Manning. HotpotQA: A dataset for diverse, explainable multi-hop question answering. In E.&nbsp;Riloff, D.&nbsp;Chiang, J.&nbsp;Hockenmaier, and J.&nbsp;Tsujii, editors, Proceedings of the 2018 Conference on Empirical Methods in Natural Language Processing, Brussels, Belgium, October 31 - November 4, 2018 , pages 2369–2380. Association for Computational Linguistics, 2018. doi: 10.18653/V1/D18-1259. URL https://aclanthology.org/D18-1259/ .
* Yao et&nbsp;al. [2023] S.&nbsp;Yao, J.&nbsp;Zhao, D.&nbsp;Yu, N.&nbsp;Du, I.&nbsp;Shafran, K.&nbsp;Narasimhan, and Y.&nbsp;Cao. ReAct: Synergizing reasoning and acting in language models. In International Conference on Learning Representations (ICLR) , 2023.
* Yasunaga et&nbsp;al. [2022] M.&nbsp;Yasunaga, A.&nbsp;Bosselut, H.&nbsp;Ren, X.&nbsp;Zhang, C.&nbsp;D. Manning, P.&nbsp;Liang, and J.&nbsp;Leskovec. Deep bidirectional language-knowledge graph pretraining. In Neural Information Processing Systems (NeurIPS) , 2022. URL https://arxiv.org/abs/2210.09338 .
* Yoran et&nbsp;al. [2023] O.&nbsp;Yoran, T.&nbsp;Wolfson, B.&nbsp;Bogin, U.&nbsp;Katz, D.&nbsp;Deutch, and J.&nbsp;Berant. Answering questions by meta-reasoning over multiple chains of thought. In The 2023 Conference on Empirical Methods in Natural Language Processing , 2023. URL https://openreview.net/forum?id=ebSOK1nV2r .
* Yu et&nbsp;al. [2023] W.&nbsp;Yu, D.&nbsp;Iter, S.&nbsp;Wang, Y.&nbsp;Xu, M.&nbsp;Ju, S.&nbsp;Sanyal, C.&nbsp;Zhu, M.&nbsp;Zeng, and M.&nbsp;Jiang. Generate rather than retrieve: Large language models are strong context generators. In The Eleventh International Conference on Learning Representations , 2023. URL https://openreview.net/forum?id=fB0hRu9GZUS .
* Zhang et&nbsp;al. [2023] K.&nbsp;Zhang, B.&nbsp;Jimenez&nbsp;Gutierrez, and Y.&nbsp;Su. Aligning instruction tasks unlocks large language models as zero-shot relation extractors. In A.&nbsp;Rogers, J.&nbsp;Boyd-Graber, and N.&nbsp;Okazaki, editors, Findings of the Association for Computational Linguistics: ACL 2023 , pages 794–812, Toronto, Canada, July 2023. Association for Computational Linguistics. doi: 10.18653/v1/2023.findings-acl.50. URL https://aclanthology.org/2023.findings-acl.50 .
* Zhang et&nbsp;al. [2024a] N.&nbsp;Zhang, Y.&nbsp;Yao, B.&nbsp;Tian, P.&nbsp;Wang, S.&nbsp;Deng, M.&nbsp;Wang, Z.&nbsp;Xi, S.&nbsp;Mao, J.&nbsp;Zhang, Y.&nbsp;Ni, et&nbsp;al. A comprehensive study of knowledge editing for large language models. arXiv preprint arXiv:2401.01286 , 2024a.
* Zhang et&nbsp;al. [2024b] X.&nbsp;Zhang, Y.&nbsp;Chen, S.&nbsp;Hu, Z.&nbsp;Xu, J.&nbsp;Chen, M.&nbsp;K. Hao, X.&nbsp;Han, Z.&nbsp;L. Thai, S.&nbsp;Wang, Z.&nbsp;Liu, and M.&nbsp;Sun. bench: Extending long context evaluation beyond 100k tokens, 2024b.
* Zhong et&nbsp;al. [2023] Z.&nbsp;Zhong, Z.&nbsp;Wu, C.&nbsp;D. Manning, C.&nbsp;Potts, and D.&nbsp;Chen. Mquake: Assessing knowledge editing in language models via multi-hop questions. In Conference on Empirical Methods in Natural Language Processing , 2023. URL https://aclanthology.org/2023.emnlp-main.971.pdf .
* Zhou et&nbsp;al. [2022] S.&nbsp;Zhou, B.&nbsp;Yu, A.&nbsp;Sun, C.&nbsp;Long, J.&nbsp;Li, and J.&nbsp;Sun. A survey on neural open information extraction: Current status and future directions. In L.&nbsp;D. Raedt, editor, Proceedings of the Thirty-First International Joint Conference on Artificial Intelligence, IJCAI-22 , pages 5694–5701. International Joint Conferences on Artificial Intelligence Organization, 7 2022. doi: 10.24963/ijcai.2022/793. URL https://doi.org/10.24963/ijcai.2022/793 . Survey Track.
* Zhu et&nbsp;al. [2023] H.&nbsp;Zhu, H.&nbsp;Peng, Z.&nbsp;Lyu, L.&nbsp;Hou, J.&nbsp;Li, and J.&nbsp;Xiao. Pre-training language model incorporating domain-specific heterogeneous knowledge into a unified representation. Expert Systems with Applications , 215:119369, 2023. ISSN 0957-4174. doi: https://doi.org/10.1016/j.eswa.2022.119369. URL https://www.sciencedirect.com/science/article/pii/S0957417422023879 .
* Zhu et&nbsp;al. [2021] Y.&nbsp;Zhu, L.&nbsp;Pang, Y.&nbsp;Lan, H.&nbsp;Shen, and X.&nbsp;Cheng. Adaptive information seeking for open-domain question answering. In M.-F. Moens, X.&nbsp;Huang, L.&nbsp;Specia, and S.&nbsp;W.-t. Yih, editors, Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing , pages 3615–3626, Online and Punta Cana, Dominican Republic, Nov. 2021. Association for Computational Linguistics. doi: 10.18653/v1/2021.emnlp-main.293. URL https://aclanthology.org/2021.emnlp-main.293 .

## Appendices

Within this supplementary material, we elaborate on the following aspects:

* •

 Appendix [A](https://arxiv.org/html/2405.14831v3#A1 "Appendix A HippoRAG Pipeline Example ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): HippoRAG Pipeline Example

* •

 Appendix [B](https://arxiv.org/html/2405.14831v3#A2 "Appendix B Dataset Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): Dataset Comparison

* •

 Appendix [C](https://arxiv.org/html/2405.14831v3#A3 "Appendix C Ablation Statistics ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): Ablation Statistics

* •

 Appendix [D](https://arxiv.org/html/2405.14831v3#A4 "Appendix D Intrinsic OpenIE Evaluation ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): Intrinsic OpenIE Evaluation

* •

 Appendix [E](https://arxiv.org/html/2405.14831v3#A5 "Appendix E Case Study on Path-Finding Multi-Hop QA ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): Path-Finding Multi-Hop Case Study

* •

 Appendix [F](https://arxiv.org/html/2405.14831v3#A6 "Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): Error Analysis

* •

 Appendix [G](https://arxiv.org/html/2405.14831v3#A7 "Appendix G Cost and Efficiency Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): Cost and Efficiency Comparison

* •

 Appendix [H](https://arxiv.org/html/2405.14831v3#A8 "Appendix H Implementation Details & Compute Requirements ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): Implementation Details & Compute Requirements

* •

 Appendix [I](https://arxiv.org/html/2405.14831v3#A9 "Appendix I LLM Prompts ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"): LLM Prompts

## Appendix A HippoRAG Pipeline Example

To better demonstrate how our HippoRAG pipeline works, we use the path-following example from the MuSiQue dataset shown in Table [7](https://arxiv.org/html/2405.14831v3#S5.T7 "Table 7 ‣ 5.2 HippoRAG’s Advantage: Single-Step Multi-Hop Retrieval ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). We use HippoRAG’s indexing and retrieval processes to follow this question and a subset of the associated corpus. The question, its answer, and its supporting and distractor passages are as shown in Figure [3](https://arxiv.org/html/2405.14831v3#A1.F3 "Figure 3 ‣ Appendix A HippoRAG Pipeline Example ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). The indexing stage is shown in Figure [4](https://arxiv.org/html/2405.14831v3#A1.F4 "Figure 4 ‣ Appendix A HippoRAG Pipeline Example ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), showing both the OpenIE procedure as well as the relevant subgraph of our KG. Finally, we illustrate the retrieval stage in Figure [5](https://arxiv.org/html/2405.14831v3#A1.F5 "Figure 5 ‣ Appendix A HippoRAG Pipeline Example ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), including query NER, query node retrieval, how the PPR algorithm changes node probabilities, and how the top retrieval results are calculated.

![Refer to caption](x3.png)

Figure 3: HippoRAG Pipeline Example (Question and Annotations). (Top) We provide an example question and its answer. (Middle &amp; Bottom) The supporting and distractor passages for this question. Two supporting passages are needed to solve this question. The excerpts of the distractor passages are related to the “district” mentioned in the question.

![Refer to caption](x4.png)

Figure 4: HippoRAG Pipeline Example (Indexing). NER and OpenIE are sequentially conducted on each passage of the corpus. Thus, an open knowledge graph is formed for the entire corpus. We only show the relevant subgraph from the KG.

![Refer to caption](x5.png)

Figure 5: HippoRAG Pipeline Example (Retrieval). For retrieval, the named entities in the query are extracted from the question (Top), after which the query nodes are chosen using a retrieval encoder. In this case, the name of the query named entity, “Alhandra”, is equivalent to its KG node. (Middle) We then set the personalized probabilities for PPR based on the retrieved query nodes. After PPR, the query node probability is distributed according to the subgraph in Figure [4](https://arxiv.org/html/2405.14831v3#A1.F4 "Figure 4 ‣ Appendix A HippoRAG Pipeline Example ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), leading to some probability mass on the node “Vila France de Xira”. (Bottom) These node probabilities are then summed over the passages they appear in to obtain the passage-level ranking. The top-ranked nodes after PPR are highlighted in the top-ranked passages.

## Appendix B Dataset Comparison

To analyze the differences between the three datasets we use, we pay special attention to the quality of the distractor passages, i.e., whether they can be effectively confounded with the supporting passages. We use Contriever \[[35](https://arxiv.org/html/2405.14831v3#bib.bib35)\] to calculate the match score between questions and candidate passages and show their densities in Figure [6](https://arxiv.org/html/2405.14831v3#A2.F6 "Figure 6 ‣ Appendix B Dataset Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). In an ideal case, the distribution of distractor scores should be close to the mean of the support passage scores. However, it can be seen that the distribution of the distractor scores in HotpotQA is much closer to the lower bound of the support passage scores compared to the other two datasets.

![Refer to caption](x6.png)

Figure 6: Density of similarity scores of candidate passages (distractors and supporting passages) obtained by Contriever. The similarity score of HotpotQA distractors is not substantially larger than that of the least similar supporting passages, meaning that these distractors are not very effective.

## Appendix C Ablation Statistics

We use GPT-3.5 Turbo, REBEL \[[34](https://arxiv.org/html/2405.14831v3#bib.bib34)\] and Llama-3.1 (8B and 70B) \[[1](https://arxiv.org/html/2405.14831v3#bib.bib1)\] for OpenIE ablation experiments. As shown in Table [8](https://arxiv.org/html/2405.14831v3#A3.T8 "Table 8 ‣ Appendix C Ablation Statistics ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), compared to both GPT-3.5 Turbo and both Llama models, REBEL generates around half the number of nodes and edges. This illustrates REBEL’s lack of flexibility in open information extraction when compared to using both open and closed-source LLMs. Meanwhile, both Llama-3.1 versions produce a similar amount of OpenIE triples than GPT-3.5 Turbo.

Table 8: Knowledge graph statistics using different OpenIE methods.

Model

Count

MuSiQue

2Wiki

HotpotQA

GPT-3.5 Turbo (1106) [ 55 ] (Default)

# of Unique Nodes ( )







# of Unique Edges ( )







# of Unique Triples







# of ColBERTv2 Synonym Edges ( )







REBEL-large [ 34 ]

# of Unique Nodes ( )







# of Unique Edges ( )







# of Unique Triples







# of ColBERTv2 Synonym Edges ( )







Llama-3.1-8B-Instruct [ 1 ]

# of Unique Nodes ( )







# of Unique Edges ( )







# of Unique Triples







# of ColBERTv2 Synonym Edges ( )







Llama-3.1-70B-Instruct [ 1 ]

# of Unique Nodes ( )







# of Unique Edges ( )







# of Unique Triples







# of ColBERTv2 Synonym Edges ( )







## Appendix D Intrinsic OpenIE Evaluation

In order to better understand how OpenIE and retrieval interact, we extracted gold triples from 20 documents from the MuSiQue training dataset. In total, we extracted 239 gold triples. From the results in Table [9](https://arxiv.org/html/2405.14831v3#A4.T9 "Table 9 ‣ Appendix D Intrinsic OpenIE Evaluation ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), we first note that there is a massive difference between end-to-end information extraction systems like REBEL and LLMs. Additionally, we note that there is some correlation better OpenIE and retrieval performance, given that the 8B Llama-3.1-Instruct version performs worse that its 70B counterpart in both retrieval and intrinsic metrics. More specifically, we see that this larger model only provides intrinsic improvements in the recall metric, which seems specially important in improving retrieval performance. Finally, we note that this evaluation is not perfectly correlated with retrieval performance, since GPT-3.5’s intrinsic performance is much stronger than Llama-3.1-70B-Instruct while its retrieval score is only slightly higher.

Table 9: Intrinsic OpenIE evaluation using the CaRB \[[6](https://arxiv.org/html/2405.14831v3#bib.bib6)\] framework on 20 annotated passages.

AUC

Precision

Recall

F1

GPT-3.5 Turbo (1106) [[55](https://arxiv.org/html/2405.14831v3#bib.bib55)] (Default)









Llama-3.1-8B-Instruct [[1](https://arxiv.org/html/2405.14831v3#bib.bib1)]









Llama-3.1-70B-Instruct [[1](https://arxiv.org/html/2405.14831v3#bib.bib1)]









REBEL [[34](https://arxiv.org/html/2405.14831v3#bib.bib34)]









## Appendix E Case Study on Path-Finding Multi-Hop QA

As discussed above, path-finding multi-hop questions across passages are exceedingly challenging for single-step and multi-step RAG methods such as ColBERTv2 and IRCoT. These questions require integrating information across multiple passages to find relevant entities among many possible candidates, such as finding all Stanford professors who work on the neuroscience of Alzheimer’s.

### E.1 Path-Finding Multi-Hop Question Construction Process

These questions and the curated corpora around them were built through the following procedure. The first two questions follow a slightly separate process as the third one as well as the motivating example in the main paper. For the first two, we first identify a book or movie and then found the book’s author or the movie’s director. We would then find 1) a trait for either the book/movie and 2) another trait for the author/director. These two traits would then be used to extract distractors from Wikipedia for each question.

For the third question and our motivating example, we first choose a professor or a drug at random as the answer for each question. We then obtain the university the professor works at or the disease the drug treats as well as one other trait for the professor or drug (in these questions research topic and mechanism of action were chosen). In these questions, distractors were extracted from Wikipedia using the University or disease on the one hand and the research topic or mechanism of action on the other. This process, although quite tedious, allowed us to curate these challenging but realistic path-finding multi-hop questions.

### E.2 Qualitative Analysis

In Table [10](https://arxiv.org/html/2405.14831v3#A5.T10 "Table 10 ‣ E.2 Qualitative Analysis ‣ Appendix E Case Study on Path-Finding Multi-Hop QA ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), we show three more examples from three different domains that illustrate HippoRAG’s potential for solving retrieval tasks that require such cross-passage knowledge integration.

In the first question of Table [10](https://arxiv.org/html/2405.14831v3#A5.T10 "Table 10 ‣ E.2 Qualitative Analysis ‣ Appendix E Case Study on Path-Finding Multi-Hop QA ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), we want to find a book published in 2012 by an English author who won a specific award. In contrast to HippoRAG, ColBERTv2 and IRCoT are unable to identify Mark Haddon as such an author. ColBERTv2 focuses on passages related to awards while IRCoT mistakenly decides that Kate Atkinson is the answer to such question since she won the same award for a book published in 1995. For the second question, we wanted to find a war film based on a non-fiction book directed by someone famous for sci-fi and crime movies. HippoRAG is able to find our answer Black Hawk Down by Ridley Scott within the first four passages, while ColBERTv2 misses the answer completely and retrieves other films and film collections. In this instance, even though IRCoT is able to retrieve Ridley Scott, it does so mainly through parametric knowledge. The chain-of-thought output discusses his and Denis Villeneuve fame as well as their sci-fi and crime experience. Given the three-step iteration restriction used here and the need to explore two directors, the specific war film Black Hawk Down was not identified. Although a bit convoluted, people often ask these first two questions to remember a specific movie or book they watched or heard about from only a handful of disjointed details.

Finally, the third question is more similar to the motivating example in the main paper and shows the importance of this type of question in real-world domains. In this question, we ask for a drug used to treat lymphocytic leukemia through a specific mechanism (cytosolic p53 interaction). While HippoRAG is able to leverage the associations within the supporting passages to identify the Chlorambucil passage as the most important, ColBERTv2 and IRCoT are only able to extract passages associated with lymphocytic leukemia. Interestingly enough, IRCoT uses its parametric knowledge to guess that Venetoclax, which also treats leukemia, would do so through the relevant mechanism even though no passage in the curated dataset explicitly stated this.

Table 10: Ranking result examples for different approaches on several path-finding multi-hop questions.

Question

HippoRAG

ColBERTv2

IRCoT

Which book was

published in 2012 by an

English author who is a

Whitbread Award

winner?

1. Oranges Are

Not the Only Fruit

2. William Trevor

Legacies

3. Mark Haddon

1. World Book Club

Prize winners

2. Leon Garfield

Awards

3. Twelve Bar

Blues (novel)

1. Kate Atkinson

2. Leon Garfield

Awards

3. Twelve Bar

Blues (novel)

Which war film based

on a non fiction book

was directed by someone

famous in the science

fiction and crime

genres?

1. War Film

2. Time de Zarn

3. Outline of Sci-Fi

4. Black Hawk

Down

1. Paul Greengrass

2. List of book-based

war films

3. Korean War Films

4. All the King’s

Men Book

1. Ridley Scott

2. Peter Hyams

3. Paul Greengrass

4. List of book-based

war films

What drug is used to

treat chronic

lymphocytic leukemia

by interacting with

cytosolic p53?

1. Chlorambucil

2. Lymphocytic

leukemia

3. Mosquito bite

allergy

1. Lymphocytic

leukemia

2. Obinutuzumab

3. Venetoclax

1. Venetoclax

2. Lymphocytic

leukemia

3. Idelalisib

## Appendix F Error Analysis

### F.1 Overview

In this section, we provide a detailed error analysis of 100 errors made by HippoRAG on the MuSiQue dataset. As shown in Table [11](https://arxiv.org/html/2405.14831v3#A6.T11 "Table 11 ‣ F.1 Overview ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), these errors can be categorized into three main types: NER, OpenIE and PPR.

The main error type, with nearly half of all error examples, is due to limitations of our NER based design. As further discussed in §[F.2](https://arxiv.org/html/2405.14831v3#A6.SS2 "F.2 Concepts vs. Context Tradeoff ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), our NER design does not extract enough information from the query for retrieval. For example, in the question “When was one internet browser’s version of Windows 8 made accessible?”, only the phrase “Windows 8” is extracted, leaving any signal about “browsers” or “accessibility” behind for the subsequent graph search. OpenIE errors, the second most common, are discussed in more detail in §[F.3](https://arxiv.org/html/2405.14831v3#A6.SS3 "F.3 OpenIE Limitations ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

We define the third error category as cases where both NER and OpenIE are functioning properly but the PPR algorithm is still unable to identify relevant subgraphs, often due to confounding signals. For instance, consider the query “How many refugees emigrated to the European country where Huguenots felt a kinship for emigration?”. Despite the term “Huguenots” being accurately extracted from both the question and the supporting passages, and the PPR algorithm initiating with the nodes labeled “European” and “Huguenots”, the PPR algorithm struggles to find the appropriate subgraphs around them that define the most related passage. This occurs when multiple passages exist in the corpus that discuss very similar topics since the PPR algorithm is not able to leverage query context directly.

Table 11: Error analysis on MuSiQue.

Error Type

Error Percentage (%)

NER Limitation



Incorrect/Missing OpenIE



PPR



### F.2 Concepts vs. Context Tradeoff

Given our method’s entity-centric nature in extraction and indexing, it has a strong bias towards concepts that leaves many contextual signals unused. This design enables single-step multi-hop retrieval while also enabling contextual cues to avoid distracting from more salient entities. As seen in the first example in Table [12](https://arxiv.org/html/2405.14831v3#A6.T12 "Table 12 ‣ F.2 Concepts vs. Context Tradeoff ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), ColBERTv2 uses the context to retrieve passages that are related to famous Spanish navigators but not “Sergio Villanueva”, who is a boxer. In contrast, HippoRAG is able to hone in on “Sergio” and retrieve one relevant passage.

Unfortunately, this design is also one of our method’s greatest limitations since ignoring contextual cues accounts for around % of errors in our small-scale error analysis. This problem is more apparent in the second example since the concepts are general, making the context more important. Since the only concept tagged by HippoRAG is “protons”, it extracts passages related to “Uranium” and “nuclear weapons” while ColBERTv2 uses the context to extract more relevant passages associated with the discovery of atomic numbers.

Table 12: Examples showing the concept-context tradeoff on MuSiQue.

Question

HippoRAG

ColBERTv2

Whose father was a navigator

who explored the east coast

of the continental region where

Sergio Villanueva would

later be born?

Sergio Villanueva

César Gaytan

Faustino Reyes

Francisco de Eliza (navigator)

Exploration of N. America

Vicente Pinzón (navigator)

What undertaking included the

person who discovered that the

number of protons in each

element’s atoms is unique?

Uranium

Chemical element

History of nuclear weapons

Atomic number

Atomic theory

Atomic nucleus

Table 13: Single-step retrieval performance. HippoRAG performs substantially better on MuSiQue and 2WikiMultiHopQA than all baselines and achieves comparable performance on the less challenging HotpotQA dataset.

Model

Retriever

MuSiQue

2Wiki

HotpotQA

Average

R@2

R@5

R@2

R@5

R@2

R@5

R@2

R@5

Baseline

Contriever

















ColBERTv2

















HippoRAG

Contriever

















ColBERTv2

















HippoRAG w/ Uncertainty Ensemble

Contriever

















ColBERTv2

















To get a better trade-off between concepts and context, we introduce an ensembling setting where HippoRAG scores are ensembled with dense retrievers when our parahippocampal region shows uncertainty regarding the link between query and KG entities. This process represents instances when no hippocampal index was fully activated by the upstream parahippocampal signal and thus the neocortex must be relied on more strongly. We only use uncertainty ensembling if one of the query-KG entity scores is lower than a threshold , for example, if there was no Stanford node in the KG and the closest node in the KG is something that has a cosine similarity lower than such as Stanford Medical Center. The final passage score for uncertainty ensembling is the average of the HippoRAG scores and standard passage retrieval using model , both of which are first normalized into the to over all passages.

When HippoRAG is ensembled with under “Uncertainty Ensemble”, it further improves on MuSiQue and outperforms our baselines in R@5 for HotpotQA, as shown in Table [13](https://arxiv.org/html/2405.14831v3#A6.T13 "Table 13 ‣ F.2 Concepts vs. Context Tradeoff ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). When used in combination with IRCoT, as shown in Table [14](https://arxiv.org/html/2405.14831v3#A6.T14 "Table 14 ‣ F.2 Concepts vs. Context Tradeoff ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), the ColBERTv2 ensemble outperforms all previous baselines in both R@2 and R@5 on HotpotQA. Although the simplicity of this approach is promising, more work needs to be done to solve this context-context tradeoff since simple ensembling does lower performance in some cases, especially for the 2WikiMultiHopQA dataset.

Table 14: Multi-step retrieval performance. Combining HippoRAG with standard multi-step retrieval methods like IRCoT results in substantial improvements on all three datasets.

Model

Retriever

MuSiQue

2Wiki

HotpotQA

Average

R@2

R@5

R@2

R@5

R@2

R@5

R@2

R@5

IRCoT

Contriever

















ColBERTv2

















IRCoT + HippoRAG

Contriever

















ColBERTv2

















IRCoT + HippoRAG w/ Uncertainty Ensemble

Contriever

















ColBERTv2

















### F.3 OpenIE Limitations

OpenIE is a critical step in extracting structured knowledge from unstructured text. Nonetheless, its shortcomings can result in gaps in knowledge that may impair retrieval and QA capabilities. As shown in Table [15](https://arxiv.org/html/2405.14831v3#A6.T15 "Table 15 ‣ F.3 OpenIE Limitations ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), GPT-3.5 Turbo overlooks the crucial song title “Don’t Let Me Wait Too Long” during the OpenIE process. This title represents the most significant element within the passage. A probable reason is that the model is insensitive to such a long entity. Besides, the model does not accurately capture the beginning and ending years of the war, which are essential for the query. This is an example of how models routinely ignore temporal properties. Overall, these failures highlight the need to improve the extraction of critical information.

Table 15: Open information extraction error examples on MuSiQue.

Question

Passage

Missed Triples

What company is the label responsible for “Don’t Let Me Wait Too Long” a part of?

“Don’t Let Me Wait Too Long” was sequenced on side one of the LP, between the ballads “The Light That Has Lighted the World” and “Who Can See It” …

(Don’t Let Me Wait Too Long, sequenced on, side one of the LP)

When did the president of the Confederate States of America end his fight in the Mexican-American war?

Jefferson Davis fought in the Mexican–American War (1846–1848), as the colonel of a volunteer regiment …

(Mexican-American War, starts, 1846), (Mexican-American War, ends, 1848)

### F.4 OpenIE Document Length Analysis

Finally, we present a small-scale intrinsic experiment to help us understand the robustness of our OpenIE methods to increasing passage length. The length-dependent evaluation results in Table [16](https://arxiv.org/html/2405.14831v3#A6.T16 "Table 16 ‣ F.4 OpenIE Document Length Analysis ‣ Appendix F Error Analysis ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), show that GPT-3.5-Turbo OpenIE results deteriorate substantially when extracting from longer instead of shorter passages. This is likely due to a higher sentence and paragraph complexity for longer passages which leads to lower quality extraction. More work is needed to address this limitation since further chunking would only create other issues due to sentence interdependence.

Table 16: Intrinsic OpenIE evaluation using the CaRB \[[6](https://arxiv.org/html/2405.14831v3#bib.bib6)\] framework. Performance difference between the 10 longest and 10 shortest annotated passages using our default GPT-3.5 Turbo (1106) model.

AUC

Precision

Recall

F1

10 Shortest Passages









10 Longest Passages









## Appendix G Cost and Efficiency Comparison

One of HippoRAG’s main advantages against iterative retrieval methods is the dramatic online retrieval efficiency gains brought on by its single-step multi-hop retrieval ability in terms of both cost and time. Specifically, as seen in Table [17](https://arxiv.org/html/2405.14831v3#A7.T17 "Table 17 ‣ Appendix G Cost and Efficiency Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), retrieval costs for IRCoT are to times higher than HippoRAG since it only requires extracting relevant named entities from the query instead of processing all of the retrieved documents. In systems with extremely high usage, a cost difference of an order of magnitude such as this one could be extremely important. The difference with IRCoT in terms of latency is also substantial, although more challenging to measure exactly. Also as seen in Table [17](https://arxiv.org/html/2405.14831v3#A7.T17 "Table 17 ‣ Appendix G Cost and Efficiency Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), HippoRAG can be to times faster than IRCoT, depending on the number of retrieval rounds that need to be executed ( \- in our experiments). 6 6 6We use a single thread to query the OpenAI API for online retrieval in both IRCoT and HippoRAG. Since IRCoT is an iterative process and each of the iterations must be done sequentially, these speed comparisons are appropriate.

Table 17: Average cost and efficiency measurements for online retrieval using GPT-3.5 Turbo on queries.

ColBERTv2

IRCoT

HippoRAG

API Cost ($)



 - 



Time (minutes)



 - 



Although offline indexing time and costs are higher for HippoRAG than IRCoT—around times slower and $ more expensive for every passages 7 7 7To speed up indexing, we use threads querying gpt-3.5-turbo-1106 through the OpenAI API in parallel. At the time of writing, the cost of the API is $ for a million input tokens and $ for a million output tokens., these costs can be dramatically reduced by leveraging open source LLMs. As shown in our ablation study in Table [5](https://arxiv.org/html/2405.14831v3#S5.T5 "Table 5 ‣ 5.1 What Makes HippoRAG Work? ‣ 5 Discussions ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") Llama-3.1-70B-Instruct \[[1](https://arxiv.org/html/2405.14831v3#bib.bib1)\] performs similarly to GPT-3.5 Turbo even though it can be deployed locally using vLLM \[[40](https://arxiv.org/html/2405.14831v3#bib.bib40)\] and 4 H100 GPUs to index 10,000 documents in around 4 hours, as seen in Table [18](https://arxiv.org/html/2405.14831v3#A7.T18 "Table 18 ‣ Appendix G Cost and Efficiency Comparison ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"). Additionally, since these costs could be even further reduced by locally deploying this model, the barriers for using HippoRAG at scale could be well within the computational budget of many organizations. Finally, we note that even if LLM generation cost drops, the online retrieval efficiency gains discussed above remain intact given that the number of tokens required for IRCoT vs. HippoRAG stay constant and LLM use is likely to also remain the system’s main computational bottleneck.

Table 18: Average cost and latency measurements for offline indexing using GPT-3.5 Turbo and locally deployed Llama-3.1 (8B and 70B) using vLLM on passages.

Model

Metric

ColBERTv2

IRCoT

HippoRAG

GPT-3.5 Turbo-1106 (Main Results)

API Cost ($)







Time (minutes)







GPT-3.5 Turbo-0125

API Cost ($)







Time (minutes)







Llama-3.1-8B-Instruct

API Cost ($)







Time (minutes)







Llama-3.1-70B-Instruct

API Cost ($)







Time (minutes)







## Appendix H Implementation Details & Compute Requirements

Apart from the details included in §[3.4](https://arxiv.org/html/2405.14831v3#S3.SS4 "3.4 Implementation Details ‣ 3 Experimental Setup ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), we use implementations based on PyTorch \[[59](https://arxiv.org/html/2405.14831v3#bib.bib59)\] and HuggingFace \[[86](https://arxiv.org/html/2405.14831v3#bib.bib86)\] for both Contriever \[[35](https://arxiv.org/html/2405.14831v3#bib.bib35)\] and ColBERTv2 \[[70](https://arxiv.org/html/2405.14831v3#bib.bib70)\]. We use the python-igraph \[[13](https://arxiv.org/html/2405.14831v3#bib.bib13)\] implementation of the PPR algorithm. For BM25, we employ Elastic Search \[[24](https://arxiv.org/html/2405.14831v3#bib.bib24)\]. For multi-step retrieval, we use the same prompt implementation as IRCoT \[[78](https://arxiv.org/html/2405.14831v3#bib.bib78)\] and retrieve the top- passages at each step. We set the maximum number of reasoning steps to for HotpotQA and 2WikiMultiHopQA and for MuSiQue due to their maximum reasoning chain length. We combine IRCoT with different retrievers by replacing its base retriever BM25 with each retrieval method, including HippoRAG, noted as “IRCoT + HippoRAG” below. 8 8 8Since the original IRCoT does not provide a score for each retrieved passage, we employ beam search for the iterative retrieval process. Each candidate passage maintains the highest historical score during beam search. For the QA reader, we use top- retrieved passages as the context and \-shot QA demonstration with CoT prompting strategy \[[78](https://arxiv.org/html/2405.14831v3#bib.bib78)\].

In terms of compute requirements, most of our compute requirements are unfortunately not disclosed by the OpenAI. We run ColBERTv2 and Contriever for indexing and retrieval we use 4 NVIDIA RTX A6000 GPUs with 48GB of memory. For indexing with Llama-3.1 models, we use 4 NVIDIA H100 GPUs with 80GB of memory. Finally, we used 2 AMD EPYC 7513 32-Core Processors to run the Personalized PageRank algorithm.

## Appendix I LLM Prompts

The prompts we used for indexing and query NER are shown in Figure [7](https://arxiv.org/html/2405.14831v3#A9.F7 "Figure 7 ‣ Appendix I LLM Prompts ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models") and Figure [8](https://arxiv.org/html/2405.14831v3#A9.F8 "Figure 8 ‣ Appendix I LLM Prompts ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models"), while the OpenIE prompt is shown in Figure [9](https://arxiv.org/html/2405.14831v3#A9.F9 "Figure 9 ‣ Appendix I LLM Prompts ‣ HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models").

![Refer to caption](x7.png)

Figure 7: Prompt for passage NER during indexing.

![Refer to caption](x8.png)

Figure 8: Prompt for query NER during retrieval.

![Refer to caption](x9.png)

Figure 9: Prompt for OpenIE during indexing.
