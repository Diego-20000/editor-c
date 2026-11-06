#include <stdio.h>
int main(void){
  int i;
  for (i = 1; i <= 4; i++) {
    int fact;
    if (i == 1) fact = 1;
    fact = fact * i;
    printf("%d ", fact);
  }
  printf("\n");
  return 0;
}
