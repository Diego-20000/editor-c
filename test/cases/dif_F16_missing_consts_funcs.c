#include <stdio.h>
#include <limits.h>
#include <float.h>
#include <math.h>
int main(void){
  printf("%ld %d %g\n", LONG_MAX, SHRT_MAX, DBL_MAX);
  printf("%f %f\n", sinh(1.0), INFINITY);
  return 0;
}
