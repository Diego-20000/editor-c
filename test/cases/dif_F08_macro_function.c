#include <stdio.h>
#define CUADRADO(x) ((x)*(x))
#define MAX(a,b) ((a)>(b)?(a):(b))
int main(void){
  printf("%d %d\n", CUADRADO(5), MAX(3,9));
  return 0;
}
