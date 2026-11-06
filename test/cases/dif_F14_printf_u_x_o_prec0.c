#include <stdio.h>
int main(void){
  printf("[%.0u] [%.0x] [%5.0o] [%.0d]\n", 0, 0, 0, 0);
  printf("[%#.3x] [%#.5o] [%#8.4X]\n", 1, 8, 255);
  printf("[%hd] [%hhd] [%hu] [%hx]\n", 65537, 257, -1, -1);
  return 0;
}
