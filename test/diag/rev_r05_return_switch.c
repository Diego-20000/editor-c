// espera: limpio
#include <stdio.h>
int menu(int x){
  while (1) {
    switch (x) { case 1: return 10; case 2: x = 1; break; default: return 0; }
  }
}
int main(){ printf("%d\n", menu(2)); return 0; }
