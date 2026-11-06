#include <stdio.h>
#include <stdlib.h>
int main(void){
  int i;
  for (i = 0; i < 5; i++) printf("%d ", rand());
  printf("\n");
  srand(42);
  for (i = 0; i < 5; i++) printf("%d ", rand() % 100);
  printf("\n");
  return 0;
}
