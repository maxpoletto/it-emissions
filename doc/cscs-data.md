1. UZH CPU hours (and maybe GPU hours?), and total CPU / GPU hours (so we can
   compute a ratio). Do not need to break down by department, etc.  
   * Waiting on my colleagues to get the numbers**

2. Total compute energy use per month or per year (or average power).  
   * monthly ~5 GWh  
   * yearly ~60 GWh

3. From 1 and 2 we should be able to estimate energy use for UZH. (this is an
   estimate based on space used not really measured)  
   * UZH monthly ~0.3 GWh  
   * UZH Yearly ~3.6 GWh

4. Approximate total number of components of different types (network
   routers/switches, storage servers, CPU cores), and an example of a typical
   device (e.g., switch model X, NAS  model Y, etc.), so that we can estimate
   total embodied emissions.

   * Here are the details of the compute nodes used by UZH: **(How many of these?)**
     * AMD EPYC 7742 CPU (Rome)        
     * 2x64 cores, 256/512 GB DDR RAM  
   * For Network and Storage they use:         
     * Interconnect HPC Cray Slingshot-11 with 200 Gbps injection bandwidth per node  
     * Scratch disk  100 PB on hard disk

5. If possible, a metric (whether jobs scheduled, or GPU load, etc.) of
   increased load of AI jobs over the past few years.  
    * Here I have no data apologies for that.
